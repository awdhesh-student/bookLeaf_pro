import { useEffect, useState, useRef } from 'react'
import { Card, Descriptions, Tag, Spin, Alert, Button, Space, Timeline, Avatar, Empty, Form, Input, message } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { authorAPI } from '../../services/api'
import socketService from '../../services/socket'
import FileUploader from '../../components/FileUploader'
import MessageAttachments from '../../components/MessageAttachments'
import './TicketDetail.css'

const STATUS_COLORS = {
  Open: 'blue',
  'In Progress': 'processing',
  Resolved: 'success',
  Closed: 'default',
}

const PRIORITY_COLORS = {
  Critical: 'red',
  High: 'orange',
  Medium: 'gold',
  Low: 'cyan',
}

export default function AuthorTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [messageLoading, setMessageLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    fetchTicket()
    initializeSocket()
    
    return () => {
      // Cleanup Socket listeners and leave room on unmount
      if (socketRef.current) {
        console.log('🔧 [AuthorTicketDetail] Cleaning up Socket...')
        // socketRef.current is the raw Socket.IO socket, not socketService
        socketRef.current.emit('ticket:leave', id)
        // Remove listeners to prevent memory leaks
        socketRef.current.off('message:created')
        socketRef.current.off('ticket:updated')
      }
    }
  }, [id])

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const data = await authorAPI.getTicketDetail(id)
      setTicket(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }

  const initializeSocket = () => {
    try {
      console.log('🔧 [AuthorTicketDetail] Initializing Socket...')
      const userJson = localStorage.getItem('bookleaf_user')
      console.log('🔧 [AuthorTicketDetail] User JSON from localStorage:', userJson)

      if (!userJson) {
        console.error('🔧 [AuthorTicketDetail] ❌ No user in localStorage!')
        return
      }

      const user = JSON.parse(userJson)
      console.log('🔧 [AuthorTicketDetail] Parsed user:', user)

      const socket = socketService.connect(user)
      console.log('🔧 [AuthorTicketDetail] Socket returned:', socket ? '✅ Socket object created' : '❌ Failed to create socket')
      
      if (!socket) {
        console.warn('🔧 [AuthorTicketDetail] Socket connection unavailable - real-time features disabled')
        return
      }

      socketRef.current = socket
      console.log('🔧 [AuthorTicketDetail] Socket stored in ref')
      setSocketConnected(true)

      // Join ticket room
      console.log('🔧 [AuthorTicketDetail] 9. Calling joinTicket...')
      socket.emit('ticket:join', id)

      socket.once('ticket:joined', () => {
        console.log('🔧 [AuthorTicketDetail] ✅ Joined ticket room:', id)
      })

      socket.once('error', (error) => {
        console.error('🔧 [AuthorTicketDetail] ❌ Failed to join ticket room:', error)
      })

      // Remove any previous listeners to avoid duplicates
      socket.off('message:created')
      socket.off('ticket:updated')

      // Listen for new messages
      const onMessageCreated = (data) => {
        console.log('🔧 [AuthorTicketDetail] 📬 New message received:', data)
        setTicket((prev) => {
          console.log('🔧 [AuthorTicketDetail] 📬 Updating ticket state with new message')
          return {
            ...prev,
            messages: [...(prev.messages || []), data.message],
          }
        })
      }

      // Listen for ticket updates (status changes)
      const onTicketUpdated = (data) => {
        console.log('🔧 [AuthorTicketDetail] 📋 Ticket updated:', data)
        setTicket((prev) => ({
          ...prev,
          status: data.status,
        }))
      }

      console.log('🔧 [AuthorTicketDetail] 11. Attaching Socket listeners...')
      socket.on('message:created', onMessageCreated)
      socket.on('ticket:updated', onTicketUpdated)
      console.log('🔧 [AuthorTicketDetail] 12. ✅ Listeners attached')

      // Store callback refs for cleanup
      socketRef.current.messageCreatedCallback = onMessageCreated
      socketRef.current.ticketUpdatedCallback = onTicketUpdated
    } catch (err) {
      console.error('🔧 [AuthorTicketDetail] ❌ Socket initialization error:', err)
    }
  }

  const handleAddReply = async (values) => {
    try {
      setMessageLoading(true)

      // If we have selected files, use FormData for multipart upload
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        formData.append('body', values.reply)
        formData.append('type', 'public_reply')

        // Add all selected files
        selectedFiles.forEach((file) => {
          formData.append('attachments', file)
        })

        // Call the upload endpoint
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/author/tickets/${id}/reply-with-attachment`,
          {
            method: 'POST',
            credentials: 'include',
            body: formData,
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to send reply with attachments')
        }

        const result = await response.json()
        setTicket(result.data)
        message.success(`Reply with ${selectedFiles.length} file(s) sent successfully`)
        form.resetFields()
        setSelectedFiles([])
      } else {
        // Original flow for replies without attachments
        let replySent = false

        // Try to send via Socket.IO first (requires active connection)
        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('message:send', { ticketId: id, body: values.reply })
          replySent = true
        } else {
          // Fallback to REST API if Socket.IO not connected or not available
          const result = await authorAPI.addPublicReply(id, {
            body: values.reply,
          })

          // REST API now returns full ticket object with messages - update state directly
          if (result && result.messages) {
            setTicket(result)
            replySent = true
          } else {
            fetchTicket()
            replySent = true
          }
        }

        if (replySent) {
          message.success('Reply sent successfully')
          form.resetFields()
        }
      }
    } catch (err) {
      console.error('Error:', err.message)
      message.error(err.message)
    } finally {
      setMessageLoading(false)
    }
  }

  const handleRefresh = () => {
    setLoading(true)
    authorAPI
      .getTicketDetail(id)
      .then((data) => {
        setTicket(data)
        setError(null)
      })
      .catch((err) => {
        setError(err.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/author/tickets')}
        >
          Back to Tickets
        </Button>
        <Alert
          message="Ticket not found"
          type="error"
          showIcon
          style={{ marginTop: '12px' }}
        />
      </div>
    )
  }

  return (
    <div className="ticket-detail-container">
      <div className="detail-header">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/author/tickets')}
        >
          Back to Tickets
        </Button>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Card
        title={
          <div className="ticket-title">
            <h1>{ticket.subject}</h1>
            <Space>
              <Tag color={STATUS_COLORS[ticket.status]}>{ticket.status}</Tag>
              <Tag color={PRIORITY_COLORS[ticket.priority]}>{ticket.priority}</Tag>
            </Space>
          </div>
        }
        className="ticket-card"
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="Ticket Number">
            <span className="ticket-number">{ticket.ticketNumber}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Category">{ticket.category}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(ticket.createdAt).toLocaleString('en-IN')}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {new Date(ticket.updatedAt).toLocaleString('en-IN')}
          </Descriptions.Item>
          {ticket.bookTitle && (
            <Descriptions.Item label="Related Book" span={2}>
              {ticket.bookTitle}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Description" span={2}>
            <div className="description-text">{ticket.description}</div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Conversation" className="conversation-card" style={{ marginTop: '24px' }}>
        {ticket.messages && ticket.messages.length > 0 ? (
          <Timeline
            items={ticket.messages.map((msg, idx) => ({
              dot: (
                <Avatar
                  size="small"
                  style={{
                    backgroundColor: msg.senderRole === 'author' ? '#1890ff' : '#52c41a',
                  }}
                >
                  {msg.senderRole === 'author' ? 'A' : 'S'}
                </Avatar>
              ),
              children: (
                <div className="message-item">
                  <div className="message-header">
                    <strong>
                      {msg.senderRole === 'author' ? 'You' : 'Support Team'}
                    </strong>
                    <span className="message-date">
                      {new Date(msg.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="message-body">{msg.body}</div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <MessageAttachments
                      attachments={msg.attachments}
                      ticketId={ticket._id}
                      messageId={msg._id}
                      senderRole={msg.senderRole}
                    />
                  )}
                </div>
              ),
            }))}
          />
        ) : (
          <Empty description="No messages yet. Awaiting support team response." />
        )}
      </Card>

      <Card title="Send Reply" className="reply-form-card" style={{ marginTop: '24px' }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleAddReply}
        >
          <Form.Item
            name="reply"
            label="Your Reply"
            rules={[
              { required: true, message: 'Please enter a reply' },
              { min: 10, message: 'Reply must be at least 10 characters' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Type your reply here..."
              disabled={messageLoading}
            />
          </Form.Item>

          <Form.Item label="Attachments (Optional)">
            <FileUploader 
              onFilesSelected={setSelectedFiles}
              maxFiles={5}
              maxFileSize={10}
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={messageLoading}
              htmlType="submit"
            >
              {selectedFiles.length > 0 
                ? `Send Reply (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})`
                : 'Send Reply'
              }
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

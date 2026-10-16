import { useEffect, useState, useRef } from 'react'
import {
  Card,
  Descriptions,
  Tag,
  Spin,
  Alert,
  Button,
  Space,
  Timeline,
  Avatar,
  Empty,
  Form,
  Input,
  Select,
  message,
  Divider,
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  SendOutlined,
  RobotOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { adminAPI } from '../../services/api'
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

const STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed']
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low']
const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
]

export default function AdminTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [messageLoading, setMessageLoading] = useState(false)
  const [socketConnected, setSocketConnected] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    fetchTicket()
    // Initialize Socket.IO
    initializeSocket()

    return () => {
      // Cleanup Socket listeners and leave room on unmount
      if (socketRef.current) {
        // socketRef.current is the raw Socket.IO socket, not socketService
        socketRef.current.emit('ticket:leave', id)
        // Remove listeners to prevent memory leaks
        socketRef.current.off('message:created')
        socketRef.current.off('ticket:updated')
        socketRef.current.off('ai:draft-ready')
      }
    }
  }, [id])

  const initializeSocket = () => {
    try {
      const userJson = localStorage.getItem('bookleaf_user')

      if (!userJson) {
        console.error('🔧 [AdminTicketDetail] ❌ STOP: No user in localStorage!')
        return
      }

      const user = JSON.parse(userJson)
      const socket = socketService.connect(user)

      if (!socket) {
        console.error('🔧 [AdminTicketDetail] ❌ STOP: socketService.connect returned null')
        return
      }

      // Store reference to the raw socket, not socketService
      socketRef.current = socket
      setSocketConnected(true)

      // Join ticket room
      socket.emit('ticket:join', id)

      socket.once('ticket:joined', () => {
        console.log('🔧 [AdminTicketDetail] ✅ Joined ticket room:', id)
      })

      socket.once('error', (error) => {
        console.error('🔧 [AdminTicketDetail] ❌ Failed to join ticket room:', error)
      })

      // Remove any previous listeners to avoid duplicates
      socket.off('message:created')
      socket.off('ticket:updated')
      socket.off('ai:draft-ready')

      // Listen for new messages
      const onMessageCreated = (data) => {
        setTicket((prev) => {
          const newMessages = [...(prev.messages || []), data.message]

          return {
            ...prev,
            messages: newMessages,
          }
        })
      }

      // Listen for ticket updates
      const onTicketUpdated = (data) => {
        setTicket((prev) => ({
          ...prev,
          status: data.status,
        }))
      }

      // Listen for AI draft ready
      const onAIDraftReady = (data) => {
        setTicket((prev) => ({
          ...prev,
          aiDraft: data.draft,
        }))
      }

      socket.on('message:created', onMessageCreated)
      socket.on('ticket:updated', onTicketUpdated)
      socket.on('ai:draft-ready', onAIDraftReady)

      // Store callback refs for cleanup
      socketRef.current.messageCreatedCallback = onMessageCreated
      socketRef.current.ticketUpdatedCallback = onTicketUpdated
      socketRef.current.draftReadyCallback = onAIDraftReady
    } catch (err) {
      console.error('🔧 [AdminTicketDetail] ❌ ===== SOCKET INIT ERROR =====')
      console.error('🔧 [AdminTicketDetail] Error:', err.message)
      console.error('🔧 [AdminTicketDetail] Stack:', err.stack)
    }
  }

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getTicketDetail(id)
      setTicket(data)
      setError(null)
    } catch (err) {
      setError(err.message)
      setTicket(null)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (status) => {
    try {
      setUpdating(true)
      await adminAPI.updateTicket(id, { status })
      message.success('Status updated successfully')
      fetchTicket()
    } catch (err) {
      message.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handlePriorityChange = async (priority) => {
    try {
      setUpdating(true)
      await adminAPI.updateTicket(id, { priority, prioritySource: 'admin' })
      message.success('Priority updated successfully')
      fetchTicket()
    } catch (err) {
      message.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleCategoryChange = async (category) => {
    try {
      setUpdating(true)
      await adminAPI.updateTicket(id, { category, categorySource: 'admin' })
      message.success('Category updated successfully')
      fetchTicket()
    } catch (err) {
      message.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleAssignToSelf = async () => {
    try {
      setUpdating(true)
      await adminAPI.assignToSelf(id)
      message.success('Ticket assigned to you')
      fetchTicket()
    } catch (err) {
      message.error(err.message)
    } finally {
      setUpdating(false)
    }
  }

  const handleGenerateDraft = async () => {
    try {
      setGeneratingDraft(true)
      const result = await adminAPI.generateAIDraft(id)
      message.success('AI draft generated')

      // Broadcast via Socket.IO using the socket service
      if (result.aiDraft) {
        socketService.broadcastAIDraftGenerated(id, result.aiDraft)
      }

      fetchTicket()
    } catch (err) {
      message.error(err.message)
    } finally {
      setGeneratingDraft(false)
    }
  }

  const handleAddMessage = async (values) => {
    try {
      setMessageLoading(true)

      // If we have selected files, use FormData for multipart upload
      if (selectedFiles.length > 0) {
        const formData = new FormData()
        formData.append('body', values.message)
        formData.append('type', values.type)

        // Add all selected files
        selectedFiles.forEach((file) => {
          formData.append('attachments', file)
        })

        // Call the upload endpoint
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/admin/tickets/${id}/messages/with-attachment`,
          {
            method: 'POST',
            credentials: 'include', // Include cookies for authentication
            body: formData,
            // Don't set Content-Type - browser will set it automatically with boundary
          }
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error?.message || 'Failed to send message with attachments')
        }

        const result = await response.json()
        setTicket(result.data)
        message.success(`Message with ${selectedFiles.length} file(s) sent successfully`)
        form.resetFields()
        setSelectedFiles([])
      } else {
        // Original flow for messages without attachments
        let messageSent = false

        // Try to send via Socket.IO first (requires active connection)
        if (socketRef.current && socketRef.current.connected) {
          // Call raw socket.emit
          socketRef.current.emit('message:send', { ticketId: id, body: values.message })
          messageSent = true
        } else {
          // Fallback to REST API if Socket.IO not connected or not available
          const result = await adminAPI.addMessage(id, {
            body: values.message,
            type: values.type,
          })

          // REST API returns the updated ticket - update state directly
          if (result && result.messages) {
            setTicket(result)
            messageSent = true
          } else {
            // Fallback: fetch full ticket
            fetchTicket()
            messageSent = true
          }
        }

        if (messageSent) {
          message.success('Message added successfully')
          form.resetFields()
        }
      }
    } catch (err) {
      console.error('📤 [AdminTicketDetail] Error:', err.message)
      message.error(err.message)
    } finally {
      setMessageLoading(false)
    }
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
          onClick={() => navigate('/admin/tickets')}
        >
          Back to Tickets
        </Button>
        <Alert message="Ticket not found" type="error" showIcon style={{ marginTop: '12px' }} />
      </div>
    )
  }

  return (
    <div className="admin-ticket-detail-container">
      <div className="detail-header">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/admin/tickets')}
        >
          Back to Tickets
        </Button>
        <Button type="default" icon={<ReloadOutlined />} onClick={fetchTicket} loading={loading}>
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
          <Descriptions.Item label="Author">{ticket.authorEmail}</Descriptions.Item>
          <Descriptions.Item label="Category">{ticket.category}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(ticket.createdAt).toLocaleString('en-IN')}
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

      <Card title="Ticket Controls" className="controls-card" style={{ marginTop: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="control-group">
            <label className="control-label">Status</label>
            <Select
              value={ticket.status}
              onChange={handleStatusChange}
              loading={updating}
              style={{ width: '200px' }}
            >
              {STATUSES.map((status) => (
                <Select.Option key={status} value={status}>
                  {status}
                </Select.Option>
              ))}
            </Select>
          </div>

          <div className="control-group">
            <label className="control-label">Priority</label>
            <Space>
              <Select
                value={ticket.priority}
                onChange={handlePriorityChange}
                loading={updating}
                style={{ width: '200px' }}
              >
                {PRIORITIES.map((priority) => (
                  <Select.Option key={priority} value={priority}>
                    {priority}
                  </Select.Option>
                ))}
              </Select>
              {ticket.prioritySource === 'ai' && (
                <Tag color="blue">AI Recommended</Tag>
              )}
            </Space>
          </div>

          <div className="control-group">
            <label className="control-label">Category</label>
            <Space>
              <Select
                value={ticket.category}
                onChange={handleCategoryChange}
                loading={updating}
                style={{ width: '250px' }}
              >
                {CATEGORIES.map((cat) => (
                  <Select.Option key={cat} value={cat}>
                    {cat}
                  </Select.Option>
                ))}
              </Select>
              {ticket.categorySource === 'ai' && (
                <Tag color="blue">AI Classified</Tag>
              )}
            </Space>
          </div>

          <div className="control-group">
            <Space>
              <Button
                type="primary"
                onClick={handleAssignToSelf}
                loading={updating}
              >
                Assign to Me
              </Button>
              <Button
                onClick={handleGenerateDraft}
                loading={generatingDraft}
                icon={<RobotOutlined />}
              >
                Generate AI Draft
              </Button>
            </Space>
          </div>
        </Space>
      </Card>

      {ticket.aiDraft && (
        <Card title="AI Generated Draft" className="ai-draft-card" style={{ marginTop: '24px' }}>
          <div className="draft-content">{ticket.aiDraft}</div>
          <div style={{ marginTop: '12px' }}>
            <Tag color="blue">Status: {ticket.aiProcessingStatus || 'Ready'}</Tag>
            {ticket.aiErrorCode && (
              <Tag color="red">Error: {ticket.aiErrorCode}</Tag>
            )}
          </div>
          <div style={{ marginTop: '16px' }}>
            <p style={{ fontSize: '12px', color: '#888' }}>
              💡 You can edit this draft before sending as a public reply. Copy the text and paste it in the "Add Message" section below.
            </p>
          </div>
        </Card>
      )}

      {ticket.aiProcessingStatus === 'failed' && (
        <Alert
          message="AI draft generation failed"
          description="Please write a manual response or try generating the draft again."
          type="warning"
          showIcon
          style={{ marginTop: '24px' }}
        />
      )}

      <Card title="Conversation" className="conversation-card" style={{ marginTop: '24px' }}>
        {ticket.messages && ticket.messages.length > 0 ? (
          <Timeline
            items={ticket.messages.map((msg) => ({
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
                      {msg.senderRole === 'author' ? 'Author' : 'Support'} {msg.type === 'internal_note' && '(Internal)'}
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
          <Empty description="No messages yet" />
        )}
      </Card>

      <Card title="Add Message" className="add-message-card" style={{ marginTop: '24px' }}>
        <Form form={form} onFinish={handleAddMessage}>
          <Form.Item
            name="type"
            label="Message Type"
            rules={[{ required: true }]}
            initialValue="public_reply"
          >
            <Select>
              <Select.Option value="public_reply">Public Reply (Author Visible)</Select.Option>
              <Select.Option value="internal_note">Internal Note (Admin Only)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[
              { required: true, message: 'Message is required' },
              { min: 5, message: 'Message must be at least 5 characters' },
            ]}
          >
            <Input.TextArea rows={4} placeholder="Type your message..." />
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
              htmlType="submit" 
              loading={messageLoading} 
              icon={<SendOutlined />}
            >
              {selectedFiles.length > 0 
                ? `Send Message (${selectedFiles.length} file${selectedFiles.length !== 1 ? 's' : ''})`
                : 'Send Message'
              }
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

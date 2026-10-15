import { useEffect, useState, useRef } from 'react'
import { Card, Descriptions, Tag, Spin, Alert, Button, Space, Timeline, Avatar, Empty, Form, Input, message } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { authorAPI } from '../../services/api'
import socketService from '../../services/socket'
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
      console.log('📤 [AuthorTicketDetail] ===== HANDLE ADD REPLY START =====')
      console.log('📤 [AuthorTicketDetail] 1. Reply:', values)
      console.log('📤 [AuthorTicketDetail] 2. socketRef.current exists:', !!socketRef.current)
      
      setMessageLoading(true)
      let replySent = false
      
      // Try to send via Socket.IO first (requires active connection)
      if (socketRef.current && socketRef.current.connected) {
        console.log('📤 [AuthorTicketDetail] 3. ✅ Socket CONNECTED - Using Socket.IO')
        console.log('📤 [AuthorTicketDetail] 4. socket.id:', socketRef.current.id)
        
        // Call raw socket.emit
        socketRef.current.emit('message:send', { ticketId: id, body: values.reply })
        console.log('📤 [AuthorTicketDetail] 5. ✅ Reply emitted via Socket.IO')
        replySent = true
        
        // If Socket fails, we'll get an error event and fall back to REST API
        // For now, assume Socket.IO delivery is async and we'll handle via setTicket listener
      } else {
        console.log('📤 [AuthorTicketDetail] ❌ Socket NOT connected (connected: ' + (socketRef.current?.connected || 'N/A') + '), using REST API')
        
        // Fallback to REST API if Socket.IO not connected or not available
        const result = await authorAPI.addPublicReply(id, {
          body: values.reply,
        })
        console.log('📤 [AuthorTicketDetail] ✅ Reply sent via REST API')
        
        // REST API now returns full ticket object with messages - update state directly
        if (result && result.messages) {
          console.log('📤 [AuthorTicketDetail] ✅ Updating state with full ticket from REST response')
          setTicket(result)
          replySent = true
        } else {
          // Fallback: fetch full ticket
          console.log('📤 [AuthorTicketDetail] ⚠️ No messages in response, fetching full ticket')
          fetchTicket()
          replySent = true
        }
      }
      
      if (replySent) {
        message.success('Reply sent successfully')
        form.resetFields()
      }
      
      console.log('📤 [AuthorTicketDetail] ===== HANDLE ADD REPLY SUCCESS =====')
    } catch (err) {
      console.error('📤 [AuthorTicketDetail] ❌ ===== HANDLE ADD REPLY ERROR =====')
      console.error('📤 [AuthorTicketDetail] Error:', err.message)
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
          <Form.Item>
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={messageLoading}
              htmlType="submit"
            >
              Send Reply
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

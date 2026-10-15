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
      if (socketRef.current) {
        socketRef.current.leaveTicket(id)
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

  const initializeSocket = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('bookleaf_user'))
      const socket = socketService.connect(user)
      
      if (!socket) {
        console.warn('Socket connection unavailable - real-time features disabled')
        return
      }

      socketRef.current = socket
      setSocketConnected(true)

      // Join ticket room
      socket.joinTicket(
        id,
        () => {
          console.log('Joined ticket room:', id)
        },
        (error) => {
          console.error('Failed to join ticket room:', error)
        }
      )

      // Listen for new messages
      socket.onMessageCreated((data) => {
        console.log('New message received:', data)
        setTicket((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), data.message],
        }))
      })

      // Listen for ticket updates (status changes)
      socket.onTicketUpdated((data) => {
        console.log('Ticket updated:', data)
        setTicket((prev) => ({
          ...prev,
          status: data.status,
        }))
      })
    } catch (err) {
      console.error('Socket initialization error:', err)
    }
  }

  const handleAddReply = async (values) => {
    try {
      setMessageLoading(true)
      
      // Send via REST API
      await authorAPI.addPublicReply(id, {
        body: values.reply,
      })
      
      // Also broadcast via Socket.IO
      if (socketRef.current) {
        socketRef.current.sendMessage(id, values.reply)
      }
      
      message.success('Reply sent successfully')
      form.resetFields()
      fetchTicket()
    } catch (err) {
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

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
  const socketRef = useRef(null)

  useEffect(() => {
    fetchTicket()
    // Initialize Socket.IO
    initializeSocket()
    
    return () => {
      // Leave ticket room on unmount
      if (socketRef.current) {
        socketRef.current.leaveTicket(id)
      }
    }
  }, [id])

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

      // Listen for ticket updates
      socket.onTicketUpdated((data) => {
        console.log('Ticket updated:', data)
        setTicket((prev) => ({
          ...prev,
          status: data.status,
        }))
      })

      // Listen for AI draft ready
      socket.onAIDraftReady((data) => {
        console.log('AI draft ready:', data)
        setTicket((prev) => ({
          ...prev,
          aiDraft: data.draft,
        }))
      })
    } catch (err) {
      console.error('Socket initialization error:', err)
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
      
      // Broadcast via Socket.IO
      if (socketRef.current && result.aiDraft) {
        socketRef.current.broadcastAIDraftGenerated(id, result.aiDraft)
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
      
      // Send via REST API first
      await adminAPI.addMessage(id, {
        body: values.message,
        type: values.type,
      })
      
      // If it's a public reply, also broadcast via Socket.IO
      if (values.type === 'public_reply' && socketRef.current) {
        socketRef.current.sendMessage(id, values.message)
      }
      
      message.success('Message added successfully')
      form.resetFields()
      fetchTicket()
    } catch (err) {
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

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={messageLoading} icon={<SendOutlined />}>
              Send Message
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

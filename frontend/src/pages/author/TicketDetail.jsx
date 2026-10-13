import { useEffect, useState } from 'react'
import { Card, Descriptions, Tag, Spin, Alert, Button, Space, Timeline, Avatar, Empty } from 'antd'
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { authorAPI } from '../../services/api'
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
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
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

    fetchTicket()
  }, [id])

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

      {ticket.aiDraft && (
        <Card title="AI Generated Draft" className="ai-draft-card" style={{ marginTop: '24px' }}>
          <div className="draft-content">{ticket.aiDraft}</div>
          <div style={{ marginTop: '12px' }}>
            <Tag color="blue">
              Processing Status: {ticket.aiProcessingStatus || 'N/A'}
            </Tag>
          </div>
        </Card>
      )}
    </div>
  )
}

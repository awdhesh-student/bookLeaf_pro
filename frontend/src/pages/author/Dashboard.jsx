import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, Alert, Button } from 'antd'
import { BookOutlined, DollarOutlined, FileDoneOutlined, FileTextOutlined } from '@ant-design/icons'
import { authorAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function AuthorDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const data = await authorAPI.getDashboard()
        setDashboard(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        setDashboard(null)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/author/tickets/new')}
        >
          Create Support Ticket
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Books"
              value={dashboard?.totalBooks || 0}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Published Books"
              value={dashboard?.publishedBooks || 0}
              prefix={<FileDoneOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Royalty Earned"
              value={dashboard?.totalRoyaltyEarned || 0}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Royalty Paid"
              value={dashboard?.royaltyPaid || 0}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Royalty Pending"
              value={dashboard?.royaltyPending || 0}
              prefix="₹"
              precision={2}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Open Support Tickets"
              value={dashboard?.openTickets || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24}>
          <Card title="Quick Actions">
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                type="primary"
                onClick={() => navigate('/author/books')}
              >
                View My Books
              </Button>
              <Button
                type="default"
                onClick={() => navigate('/author/tickets')}
              >
                View My Tickets
              </Button>
              <Button
                type="default"
                onClick={() => navigate('/author/tickets/new')}
              >
                Create New Ticket
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

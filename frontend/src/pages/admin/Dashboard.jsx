import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Spin, Alert, Button } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import { adminAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        // Fetch all tickets to calculate dashboard stats
        const ticketsData = await adminAPI.getTickets({})
        
        const stats = {
          totalTickets: ticketsData.length || 0,
          openTickets: ticketsData.filter((t) => t.status === 'Open').length || 0,
          inProgressTickets:
            ticketsData.filter((t) => t.status === 'In Progress').length || 0,
          resolvedTickets: ticketsData.filter((t) => t.status === 'Resolved').length || 0,
          highPriorityTickets:
            ticketsData.filter((t) => t.priority === 'High' || t.priority === 'Critical')
              .length || 0,
        }

        setDashboard(stats)
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
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <Button
          type="primary"
          size="large"
          onClick={() => navigate('/admin/tickets')}
        >
          Go to Ticket Queue
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Total Tickets"
              value={dashboard?.totalTickets || 0}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#667eea' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Open Tickets"
              value={dashboard?.openTickets || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="In Progress"
              value={dashboard?.inProgressTickets || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Resolved"
              value={dashboard?.resolvedTickets || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="High Priority"
              value={dashboard?.highPriorityTickets || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
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
                onClick={() => navigate('/admin/tickets')}
              >
                View All Tickets
              </Button>
              <Button
                type="default"
                onClick={() =>
                  navigate(`/admin/tickets?status=Open`)
                }
              >
                Open Tickets
              </Button>
              <Button
                type="default"
                onClick={() =>
                  navigate(`/admin/tickets?priority=High`)
                }
              >
                High Priority
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

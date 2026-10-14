import { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Alert, Button, Drawer, Descriptions, Tag } from 'antd'
import {
  FileTextOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { adminAPI } from '../../services/api'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statsDrawer, setStatsDrawer] = useState(false)
  const [detailedStats, setDetailedStats] = useState(null)
  const [authorStats, setAuthorStats] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        
        // Fetch statistics
        const stats = await adminAPI.getStatistics({})
        
        setDetailedStats(stats)
        
        // Calculate dashboard summary
        const summary = {
          totalTickets: stats.totalTickets || 0,
          openTickets: stats.statusCounts?.Open || 0,
          inProgressTickets: stats.statusCounts?.['In Progress'] || 0,
          resolvedTickets: (stats.statusCounts?.Resolved || 0) + (stats.statusCounts?.Closed || 0),
          highPriorityTickets: (stats.priorityCounts?.High || 0) + (stats.priorityCounts?.Critical || 0),
          averageResolutionTime: stats.averageResolutionTime,
        }

        setDashboard(summary)
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

  const loadDetailedStats = async () => {
    try {
      const stats = await adminAPI.getTicketsByAuthor({ limit: 5 })
      setAuthorStats(stats)
      setStatsDrawer(true)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
        <div>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard-container">
      <div className="dashboard-header">
        <h1>📊 Admin Dashboard</h1>
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
              title="High/Critical"
              value={dashboard?.highPriorityTickets || 0}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="stat-card">
            <Statistic
              title="Avg Resolution"
              value={dashboard?.averageResolutionTime || 0}
              suffix="days"
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Category Distribution">
            {detailedStats?.categoryCounts && (
              <Descriptions column={1} size="small">
                {Object.entries(detailedStats.categoryCounts).map(([category, count]) => (
                  <Descriptions.Item key={category} label={category}>
                    <Tag color="blue">{count}</Tag>
                  </Descriptions.Item>
                ))}
              </Descriptions>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Priority Breakdown">
            {detailedStats?.priorityCounts && (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Critical">
                  <Tag color="red">{detailedStats.priorityCounts.Critical || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="High">
                  <Tag color="orange">{detailedStats.priorityCounts.High || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Medium">
                  <Tag color="gold">{detailedStats.priorityCounts.Medium || 0}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Low">
                  <Tag color="cyan">{detailedStats.priorityCounts.Low || 0}</Tag>
                </Descriptions.Item>
              </Descriptions>
            )}
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
                  navigate(`/admin/tickets?priority=Critical`)
                }
              >
                Critical Priority
              </Button>
              <Button
                icon={<TeamOutlined />}
                onClick={loadDetailedStats}
              >
                Top Authors
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      <Drawer
        title="Top Authors by Ticket Count"
        onClose={() => setStatsDrawer(false)}
        open={statsDrawer}
        width={500}
      >
        {authorStats?.authorStats && authorStats.authorStats.length > 0 ? (
          <Descriptions column={1} bordered>
            {authorStats.authorStats.map((author, idx) => (
              <Descriptions.Item key={idx} label={`${idx + 1}. ${author.authorName}`}>
                <div>
                  <div>Email: {author.authorEmail}</div>
                  <div>Total Tickets: {author.ticketCount}</div>
                  <div>Open: {author.openCount} | Resolved: {author.resolvedCount}</div>
                </div>
              </Descriptions.Item>
            ))}
          </Descriptions>
        ) : (
          <div>No author data available</div>
        )}
      </Drawer>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Table, Card, Tag, Spin, Alert, Button, Space, Select, Input } from 'antd'
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { adminAPI } from '../../services/api'
import './Tickets.css'

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

const CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
]

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    status: searchParams.get('status') || '',
    priority: searchParams.get('priority') || '',
    category: '',
  })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        setLoading(true)
        const filterParams = {
          ...filters,
          page: pagination.current,
          limit: pagination.pageSize,
        }
        const cleanParams = Object.fromEntries(
          Object.entries(filterParams).filter(([_, v]) => v)
        )
        const data = await adminAPI.getTickets(cleanParams)
        setTickets(data || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setTickets([])
      } finally {
        setLoading(false)
      }
    }

    fetchTickets()
  }, [filters, pagination])

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value || '' })
    setPagination({ ...pagination, current: 1 })
  }

  const columns = [
    {
      title: 'Ticket #',
      dataIndex: 'ticketNumber',
      key: 'ticketNumber',
      width: '10%',
      render: (text) => <span className="ticket-number">{text}</span>,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      width: '20%',
      render: (text) => <span className="ticket-subject">{text}</span>,
    },
    {
      title: 'Author',
      dataIndex: 'authorEmail',
      key: 'authorEmail',
      width: '15%',
      render: (text) => <span className="author-email">{text || '—'}</span>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '12%',
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '10%',
      render: (priority) => (
        <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '10%',
      render: (date) =>
        new Date(date).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '8%',
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/admin/tickets/${record._id}`)}
        >
          View
        </Button>
      ),
    },
  ]

  const tableData = tickets.map((ticket) => ({
    ...ticket,
    key: ticket._id,
  }))

  return (
    <div className="admin-tickets-container">
      <div className="tickets-header">
        <h1>Support Ticket Queue</h1>
        <Button
          type="default"
          icon={<ReloadOutlined />}
          onClick={() => {
            setLoading(true)
            adminAPI.getTickets(filters)
              .then((data) => {
                setTickets(data || [])
                setError(null)
              })
              .catch((err) => setError(err.message))
              .finally(() => setLoading(false))
          }}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Card
        loading={loading}
        extra={
          <Space>
            <Select
              placeholder="Status"
              style={{ width: 130 }}
              allowClear
              value={filters.status || undefined}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Select.Option value="Open">Open</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Resolved">Resolved</Select.Option>
              <Select.Option value="Closed">Closed</Select.Option>
            </Select>

            <Select
              placeholder="Priority"
              style={{ width: 130 }}
              allowClear
              value={filters.priority || undefined}
              onChange={(value) => handleFilterChange('priority', value)}
            >
              <Select.Option value="Critical">Critical</Select.Option>
              <Select.Option value="High">High</Select.Option>
              <Select.Option value="Medium">Medium</Select.Option>
              <Select.Option value="Low">Low</Select.Option>
            </Select>

            <Select
              placeholder="Category"
              style={{ width: 150 }}
              allowClear
              value={filters.category || undefined}
              onChange={(value) => handleFilterChange('category', value)}
            >
              {CATEGORIES.map((cat) => (
                <Select.Option key={cat} value={cat}>
                  {cat}
                </Select.Option>
              ))}
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: tickets.length,
            showSizeChanger: true,
            onChange: (page, pageSize) =>
              setPagination({ current: page, pageSize }),
          }}
          scroll={{ x: true }}
          locale={{ emptyText: 'No tickets found' }}
        />
      </Card>
    </div>
  )
}

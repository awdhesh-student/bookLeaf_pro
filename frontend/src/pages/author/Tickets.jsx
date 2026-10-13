import { useEffect, useState } from 'react'
import { Table, Card, Tag, Spin, Alert, Button, Space, Select } from 'antd'
import { EyeOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { authorAPI } from '../../services/api'
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

export default function AuthorTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ status: '', category: '' })
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
        const data = await authorAPI.getTickets(cleanParams)
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
      width: '12%',
      render: (text) => <span className="ticket-number">{text}</span>,
    },
    {
      title: 'Subject',
      dataIndex: 'subject',
      key: 'subject',
      width: '25%',
      render: (text) => <span className="ticket-subject">{text}</span>,
    },
    {
      title: 'Book',
      dataIndex: 'bookTitle',
      key: 'bookTitle',
      width: '20%',
      render: (text) => text || 'General / Account',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      render: (text) => <Tag>{text}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '12%',
      render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '12%',
      render: (priority) => (
        <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '12%',
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
      width: '10%',
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/author/tickets/${record._id}`)}
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
    <div className="tickets-container">
      <div className="tickets-header">
        <h1>My Support Tickets</h1>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/author/tickets/new')}
          size="large"
        >
          New Ticket
        </Button>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Card
        loading={loading}
        extra={
          <Space>
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              allowClear
              value={filters.status || undefined}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Select.Option value="Open">Open</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Resolved">Resolved</Select.Option>
              <Select.Option value="Closed">Closed</Select.Option>
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

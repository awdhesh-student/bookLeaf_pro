import { useEffect, useState } from 'react'
import { Table, Card, Tag, Button, Space, Select, Input, Alert } from 'antd'
import { EyeOutlined, PlusOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons'
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
  const [filters, setFilters] = useState({ status: '', category: '', search: '' })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const navigate = useNavigate()

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

      let data
      if (cleanParams.search) {
        data = await authorAPI.searchTickets(cleanParams.search, cleanParams)
      } else {
        data = await authorAPI.getTickets(cleanParams)
      }

      setTickets(data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      setTickets([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [filters, pagination])

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value || '' })
    setPagination({ ...pagination, current: 1 })
  }

  const downloadCSV = async () => {
    try {
      const csv = await authorAPI.exportTicketsCSV(filters)
      const url = window.URL.createObjectURL(csv)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadJSON = async () => {
    try {
      const data = await authorAPI.exportTicketsJSON(filters)
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = window.URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tickets-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (err) {
      setError(err.message)
    }
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
      width: '22%',
      render: (text) => <span className="ticket-subject">{text}</span>,
    },
    {
      title: 'Book',
      dataIndex: 'bookTitle',
      key: 'bookTitle',
      width: '18%',
      render: (text) => text || 'General / Account',
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '13%',
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
      width: '7%',
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
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/author/tickets/new')}
            size="large"
          >
            New Ticket
          </Button>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={downloadCSV}
          >
            Export CSV
          </Button>
          <Button
            type="default"
            icon={<DownloadOutlined />}
            onClick={downloadJSON}
          >
            Export JSON
          </Button>
        </Space>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Card
        loading={loading}
        extra={
          <Space wrap>
            <Input
              placeholder="Search by subject..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 180 }}
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 140 }}
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

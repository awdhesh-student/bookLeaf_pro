import { useEffect, useState } from 'react'
import { Table, Card, Tag, Button, Space, Select, Input, Alert, Modal, Checkbox, Row, Col } from 'antd'
import { EyeOutlined, ReloadOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
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
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    category: '',
    search: '',
  })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })
  const [selectedTickets, setSelectedTickets] = useState([])
  const [bulkUpdateModal, setBulkUpdateModal] = useState(false)
  const [bulkUpdates, setBulkUpdates] = useState({
    status: '',
    priority: '',
  })
  const [bulkLoading, setBulkLoading] = useState(false)
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
        data = await adminAPI.searchTickets(cleanParams.search, cleanParams)
      } else {
        data = await adminAPI.getTickets(cleanParams)
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
    setSelectedTickets([])
  }

  const handleBulkUpdate = async () => {
    if (selectedTickets.length === 0) {
      return
    }

    const updates = {}
    if (bulkUpdates.status) updates.status = bulkUpdates.status
    if (bulkUpdates.priority) updates.priority = bulkUpdates.priority

    if (Object.keys(updates).length === 0) {
      setError('Please select at least one field to update')
      return
    }

    try {
      setBulkLoading(true)
      await adminAPI.bulkUpdateTickets(selectedTickets, updates)
      setBulkUpdateModal(false)
      setSelectedTickets([])
      setBulkUpdates({ status: '', priority: '' })
      fetchTickets()
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
    }
  }

  const downloadCSV = async () => {
    try {
      const csv = await adminAPI.exportTicketsCSV(filters)
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
      const data = await adminAPI.exportTicketsJSON(filters)
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
      title: (
        <Checkbox
          checked={selectedTickets.length === tickets.length && tickets.length > 0}
          indeterminate={selectedTickets.length > 0 && selectedTickets.length < tickets.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTickets(tickets.map((t) => t._id))
            } else {
              setSelectedTickets([])
            }
          }}
        />
      ),
      dataIndex: 'checkbox',
      key: 'checkbox',
      width: '4%',
      render: (_, record) => (
        <Checkbox
          checked={selectedTickets.includes(record._id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedTickets([...selectedTickets, record._id])
            } else {
              setSelectedTickets(selectedTickets.filter((id) => id !== record._id))
            }
          }}
        />
      ),
    },
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
      width: '18%',
      render: (text) => <span className="ticket-subject">{text}</span>,
    },
    {
      title: 'Author',
      dataIndex: 'authorEmail',
      key: 'authorEmail',
      width: '13%',
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
      width: '9%',
      render: (status) => <Tag color={STATUS_COLORS[status] || 'default'}>{status}</Tag>,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: '9%',
      render: (priority) => (
        <Tag color={PRIORITY_COLORS[priority] || 'default'}>{priority}</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '9%',
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
        <Space>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => fetchTickets()}
            loading={loading}
          >
            Refresh
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

      {selectedTickets.length > 0 && (
        <Alert
          message={`${selectedTickets.length} ticket(s) selected`}
          type="info"
          showIcon
          action={
            <Button
              type="primary"
              size="small"
              onClick={() => setBulkUpdateModal(true)}
            >
              Bulk Update
            </Button>
          }
          style={{ marginBottom: '24px' }}
        />
      )}

      <Card
        loading={loading}
        extra={
          <Space wrap>
            <Input
              placeholder="Search by subject..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Status"
              style={{ width: 120 }}
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
              style={{ width: 120 }}
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
              style={{ width: 140 }}
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

      <Modal
        title="Bulk Update Tickets"
        open={bulkUpdateModal}
        onCancel={() => setBulkUpdateModal(false)}
        onOk={handleBulkUpdate}
        loading={bulkLoading}
      >
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <label>Status (Optional)</label>
            <Select
              placeholder="Select status"
              style={{ width: '100%' }}
              value={bulkUpdates.status || undefined}
              onChange={(value) => setBulkUpdates({ ...bulkUpdates, status: value })}
              allowClear
            >
              <Select.Option value="Open">Open</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="Resolved">Resolved</Select.Option>
              <Select.Option value="Closed">Closed</Select.Option>
            </Select>
          </Col>
          <Col span={24}>
            <label>Priority (Optional)</label>
            <Select
              placeholder="Select priority"
              style={{ width: '100%' }}
              value={bulkUpdates.priority || undefined}
              onChange={(value) => setBulkUpdates({ ...bulkUpdates, priority: value })}
              allowClear
            >
              <Select.Option value="Critical">Critical</Select.Option>
              <Select.Option value="High">High</Select.Option>
              <Select.Option value="Medium">Medium</Select.Option>
              <Select.Option value="Low">Low</Select.Option>
            </Select>
          </Col>
        </Row>
      </Modal>
    </div>
  )
}

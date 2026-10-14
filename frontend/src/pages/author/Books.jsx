import { useEffect, useState } from 'react'
import { Table, Card, Alert, Tag, Space, Button, Drawer, Descriptions, Input, Select, Row, Col } from 'antd'
import { EyeOutlined, DownloadOutlined, SearchOutlined, BarChartOutlined } from '@ant-design/icons'
import { authorAPI } from '../../services/api'
import './Books.css'

export default function AuthorBooks() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [statsDrawer, setStatsDrawer] = useState(false)
  const [stats, setStats] = useState(null)
  const [filters, setFilters] = useState({ search: '', status: '' })
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 })

  const fetchBooks = async () => {
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
      const data = await authorAPI.getBooks(cleanParams)
      setBooks(data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [filters, pagination])

  const loadStats = async () => {
    try {
      const data = await authorAPI.getBookStats()
      setStats(data)
      setStatsDrawer(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadCSV = async () => {
    try {
      const csv = await authorAPI.exportBooksCSV(filters)
      const url = window.URL.createObjectURL(csv)
      const a = document.createElement('a')
      a.href = url
      a.download = `books-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
    } catch (err) {
      setError(err.message)
    }
  }

  const downloadJSON = async () => {
    try {
      const data = await authorAPI.exportBooksJSON(filters)
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = window.URL.createObjectURL(dataBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = `books-${new Date().toISOString().split('T')[0]}.json`
      a.click()
    } catch (err) {
      setError(err.message)
    }
  }

  const showBookDetails = (book) => {
    setSelectedBook(book)
    setDrawerVisible(true)
  }

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value || '' })
    setPagination({ ...pagination, current: 1 })
  }

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '25%',
      render: (text) => <span className="book-title">{text}</span>,
    },
    {
      title: 'ISBN',
      dataIndex: 'isbn',
      key: 'isbn',
      width: '15%',
      render: (text) => text || '—',
    },
    {
      title: 'Genre',
      dataIndex: 'genre',
      key: 'genre',
      width: '12%',
      render: (text) => text || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '15%',
      render: (status) => {
        const color = status === 'Published & Live' ? 'success' : 'processing'
        return <Tag color={color}>{status}</Tag>
      },
    },
    {
      title: 'MRP',
      dataIndex: 'mrp',
      key: 'mrp',
      width: '10%',
      render: (price) => (price ? `₹${price.toFixed(2)}` : '—'),
      align: 'right',
    },
    {
      title: 'Copies Sold',
      dataIndex: 'totalCopiesSold',
      key: 'totalCopiesSold',
      width: '12%',
      render: (copies) => copies || 0,
      align: 'right',
    },
    {
      title: 'Royalty Earned',
      dataIndex: 'totalRoyaltyEarned',
      key: 'totalRoyaltyEarned',
      width: '12%',
      render: (amount) => `₹${amount?.toFixed(2) || 0}`,
      align: 'right',
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
          onClick={() => showBookDetails(record)}
        >
          Details
        </Button>
      ),
    },
  ]

  const tableData = books.map((book) => ({
    ...book,
    key: book.bookId,
  }))

  return (
    <div className="books-container">
      <div className="books-header">
        <h1>My Books</h1>
        <Space>
          <Button
            type="default"
            icon={<BarChartOutlined />}
            onClick={loadStats}
          >
            Statistics
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
              placeholder="Search by title, genre..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Filter by status"
              style={{ width: 150 }}
              allowClear
              value={filters.status || undefined}
              onChange={(value) => handleFilterChange('status', value)}
            >
              <Select.Option value="Published & Live">Published & Live</Select.Option>
              <Select.Option value="In Production - Cover Design">In Production - Cover Design</Select.Option>
              <Select.Option value="In Production - Typesetting">In Production - Typesetting</Select.Option>
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
          locale={{ emptyText: 'No books found' }}
        />
      </Card>

      <Drawer
        title="Book Details"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={500}
      >
        {selectedBook && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Title">{selectedBook.title}</Descriptions.Item>
            <Descriptions.Item label="ISBN">{selectedBook.isbn || '—'}</Descriptions.Item>
            <Descriptions.Item label="Genre">{selectedBook.genre || '—'}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag
                color={
                  selectedBook.status === 'Published & Live' ? 'success' : 'processing'
                }
              >
                {selectedBook.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="MRP">
              {selectedBook.mrp ? `₹${selectedBook.mrp.toFixed(2)}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Royalty Per Copy">
              {selectedBook.authorRoyaltyPerCopy
                ? `₹${selectedBook.authorRoyaltyPerCopy.toFixed(2)}`
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Copies Sold">
              {selectedBook.totalCopiesSold}
            </Descriptions.Item>
            <Descriptions.Item label="Total Royalty Earned">
              ₹{selectedBook.totalRoyaltyEarned.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Royalty Paid">
              ₹{selectedBook.royaltyPaid.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Royalty Pending">
              ₹{selectedBook.royaltyPending.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Last Payout Date">
              {selectedBook.lastRoyaltyPayoutDate
                ? new Date(selectedBook.lastRoyaltyPayoutDate).toLocaleDateString()
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Publication Date">
              {selectedBook.publicationDate
                ? new Date(selectedBook.publicationDate).toLocaleDateString()
                : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Print Partner">
              {selectedBook.printPartner || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Available On">
              {selectedBook.availableOn && selectedBook.availableOn.length > 0 ? (
                <Space direction="vertical">
                  {selectedBook.availableOn.map((platform, idx) => (
                    <Tag key={idx}>{platform}</Tag>
                  ))}
                </Space>
              ) : (
                '—'
              )}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Drawer
        title="Book Statistics"
        onClose={() => setStatsDrawer(false)}
        open={statsDrawer}
        width={500}
      >
        {stats && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Total Books">
              {stats.totalBooks}
            </Descriptions.Item>
            <Descriptions.Item label="Published Books">
              {stats.publishedBooks}
            </Descriptions.Item>
            <Descriptions.Item label="In Production">
              {stats.inProductionBooks}
            </Descriptions.Item>
            <Descriptions.Item label="Total Copies Sold">
              {stats.totalCopiesSold}
            </Descriptions.Item>
            <Descriptions.Item label="Total Royalty Earned">
              ₹{stats.totalRoyaltyEarned.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Royalty Paid">
              ₹{stats.totalRoyaltyPaid.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Total Royalty Pending">
              ₹{stats.totalRoyaltyPending.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Average Royalty Per Book">
              ₹{stats.averageRoyaltyPerBook.toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="Top Selling Books">
              <Space direction="vertical">
                {stats.topSellingBooks.map((book, idx) => (
                  <div key={idx}>
                    <strong>{book.title}</strong><br />
                    Copies: {book.copies} | Royalty: ₹{book.royalty.toFixed(2)}
                  </div>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  )
}

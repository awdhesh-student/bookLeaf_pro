import { useEffect, useState } from 'react'
import { Table, Card, Spin, Alert, Tag, Space, Button, Drawer, Descriptions } from 'antd'
import { EyeOutlined } from '@ant-design/icons'
import { authorAPI } from '../../services/api'
import './Books.css'

export default function AuthorBooks() {
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedBook, setSelectedBook] = useState(null)
  const [drawerVisible, setDrawerVisible] = useState(false)

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        setLoading(true)
        const data = await authorAPI.getBooks()
        setBooks(data || [])
        setError(null)
      } catch (err) {
        setError(err.message)
        setBooks([])
      } finally {
        setLoading(false)
      }
    }

    fetchBooks()
  }, [])

  const showBookDetails = (book) => {
    setSelectedBook(book)
    setDrawerVisible(true)
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
        <span className="book-count">Total: {books.length}</span>
      </div>

      {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

      <Card loading={loading}>
        <Table
          columns={columns}
          dataSource={tableData}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: true }}
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
    </div>
  )
}

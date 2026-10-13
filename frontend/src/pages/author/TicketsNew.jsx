import { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Select,
  Radio,
  Spin,
  Alert,
  Space,
  message,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { authorAPI } from '../../services/api'
import './TicketsNew.css'

const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
]

export default function AuthorTicketsNew() {
  const [form] = Form.useForm()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [ticketType, setTicketType] = useState('book') // 'book' or 'general'
  const navigate = useNavigate()

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

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true)
      setError(null)

      const ticketData = {
        subject: values.subject,
        description: values.description,
        category: values.category,
        bookId: ticketType === 'book' ? values.bookId : null,
      }

      await authorAPI.createTicket(ticketData)
      message.success('Support ticket created successfully!')
      navigate('/author/tickets')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && books.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="tickets-new-container">
      <Card
        title="Create Support Ticket"
        className="ticket-form-card"
        loading={submitting}
      >
        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: '24px' }} />}

        <Form form={form} layout="vertical" onFinish={handleSubmit} disabled={submitting}>
          <Form.Item label="Ticket Type" className="ticket-type-selector">
            <Radio.Group value={ticketType} onChange={(e) => setTicketType(e.target.value)}>
              <Radio.Button value="book">About a Book</Radio.Button>
              <Radio.Button value="general">General / Account</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {ticketType === 'book' && (
            <Form.Item
              name="bookId"
              label="Select Book"
              rules={[{ required: true, message: 'Please select a book' }]}
            >
              <Select placeholder="Choose a book related to this ticket">
                {books.map((book) => (
                  <Select.Option key={book.bookId} value={book.bookId}>
                    {book.title} ({book.isbn || 'No ISBN'})
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select placeholder="Choose a category">
              {TICKET_CATEGORIES.map((category) => (
                <Select.Option key={category} value={category}>
                  {category}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="subject"
            label="Subject"
            rules={[
              { required: true, message: 'Subject is required' },
              { min: 5, message: 'Subject must be at least 5 characters' },
              { max: 100, message: 'Subject must be at most 100 characters' },
            ]}
          >
            <Input
              placeholder="Brief summary of your issue"
              maxLength={100}
              showCount
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[
              { required: true, message: 'Description is required' },
              { min: 10, message: 'Description must be at least 10 characters' },
              { max: 2000, message: 'Description must be at most 2000 characters' },
            ]}
          >
            <Input.TextArea
              placeholder="Please provide detailed information about your issue..."
              rows={6}
              maxLength={2000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                size="large"
              >
                Create Ticket
              </Button>
              <Button
                type="default"
                onClick={() => navigate('/author/tickets')}
                size="large"
              >
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

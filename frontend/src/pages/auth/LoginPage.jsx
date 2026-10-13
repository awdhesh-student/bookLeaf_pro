import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Alert, Row, Col, Spin } from 'antd'
import { LockOutlined, MailOutlined } from '@ant-design/icons'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import './LoginPage.css'

export default function LoginPage() {
  const [form] = Form.useForm()
  const { login, loading, error, user, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [localError, setLocalError] = useState(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'author') {
        navigate('/author/dashboard', { replace: true })
      } else if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  const handleSubmit = async (values) => {
    try {
      setLocalError(null)
      await login(values.email, values.password)
      // Navigation will happen via useEffect when user state updates
    } catch (err) {
      setLocalError(err.message)
    }
  }

  return (
    <div className="login-container">
      <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
        <Col xs={22} sm={20} md={12} lg={8}>
          <Card
            className="login-card"
            title={
              <div className="login-title">
                <span>📚</span>
                <span>BookLeaf Support Portal</span>
              </div>
            }
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              disabled={loading}
            >
              {(error || localError) && (
                <Form.Item>
                  <Alert
                    message={error || localError}
                    type="error"
                    showIcon
                    closable
                    onClose={() => setLocalError(null)}
                  />
                </Form.Item>
              )}

              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="your@email.com"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Your password"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  size="large"
                  loading={loading}
                  block
                >
                  {loading ? <Spin /> : 'Sign In'}
                </Button>
              </Form.Item>
            </Form>

            <div className="login-demo-info">
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                Demo Accounts:
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0' }}>
                👤 Author: Check database seed
              </p>
              <p style={{ fontSize: '12px', margin: '4px 0' }}>
                👨‍💼 Admin: Check database seed
              </p>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

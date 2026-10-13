import { Layout, Menu, Avatar, Button, Space, Dropdown } from 'antd'
import { LogoutOutlined, UserOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Layout.css'

const { Header, Content, Sider } = Layout

export default function AppLayout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAuthor, isAdmin } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  const getMenuItems = () => {
    if (isAuthor) {
      return [
        {
          key: '/author/dashboard',
          icon: <UserOutlined />,
          label: 'Dashboard',
          onClick: () => navigate('/author/dashboard'),
        },
        {
          key: '/author/books',
          icon: <BookOutlined />,
          label: 'Books',
          onClick: () => navigate('/author/books'),
        },
        {
          key: 'tickets-group',
          label: 'Tickets',
          icon: <FileTextOutlined />,
          children: [
            {
              key: '/author/tickets/new',
              label: 'Create New',
              onClick: () => navigate('/author/tickets/new'),
            },
            {
              key: '/author/tickets',
              label: 'My Tickets',
              onClick: () => navigate('/author/tickets'),
            },
          ],
        },
      ]
    }

    if (isAdmin) {
      return [
        {
          key: '/admin/dashboard',
          icon: <UserOutlined />,
          label: 'Dashboard',
          onClick: () => navigate('/admin/dashboard'),
        },
        {
          key: '/admin/tickets',
          icon: <FileTextOutlined />,
          label: 'Tickets',
          onClick: () => navigate('/admin/tickets'),
        },
      ]
    }

    return []
  }

  const userMenuItems = [
    {
      key: 'profile',
      label: `${user?.email}`,
      disabled: true,
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
    },
  ]

  const currentPath = location.pathname

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <div className="header-content">
          <h1 className="logo">📚 BookLeaf Support Portal</h1>
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Space className="user-menu" style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user?.email}</span>
            </Space>
          </Dropdown>
        </div>
      </Header>

      <Layout>
        <Sider width={200} className="app-sider">
          <Menu
            mode="inline"
            selectedKeys={[currentPath]}
            items={getMenuItems()}
            defaultOpenKeys={['tickets-group']}
          />
        </Sider>

        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  )
}

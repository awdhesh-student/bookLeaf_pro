import { Outlet, Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuth } from '../context/AuthContext'
import Layout from './layout/Layout'

export default function ProtectedRoute({ role }) {
  const { user, loading, isAuthenticated } = useAuth()
  console.log("user: ", user)

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && user?.role !== role) {
    console.log("role: ", role)
    return <Navigate to="/login" replace />
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

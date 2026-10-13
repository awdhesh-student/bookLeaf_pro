import { Navigate, createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/auth/LoginPage'
import AuthorDashboard from './pages/author/Dashboard'
import AuthorBooks from './pages/author/Books'
import AuthorTicketsNew from './pages/author/TicketsNew'
import AuthorTickets from './pages/author/Tickets'
import AuthorTicketDetail from './pages/author/TicketDetail'
import AdminDashboard from './pages/admin/Dashboard'
import AdminTickets from './pages/admin/Tickets'
import AdminTicketDetail from './pages/admin/TicketDetail'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/author',
    element: <ProtectedRoute role="author" />,
    children: [
      {
        index: true,
        element: <Navigate to="/author/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AuthorDashboard />,
      },
      {
        path: 'books',
        element: <AuthorBooks />,
      },
      {
        path: 'tickets/new',
        element: <AuthorTicketsNew />,
      },
      {
        path: 'tickets',
        element: <AuthorTickets />,
      },
      {
        path: 'tickets/:id',
        element: <AuthorTicketDetail />,
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute role="admin" />,
    children: [
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <AdminDashboard />,
      },
      {
        path: 'tickets',
        element: <AdminTickets />,
      },
      {
        path: 'tickets/:id',
        element: <AdminTicketDetail />,
      },
    ],
  },
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
])

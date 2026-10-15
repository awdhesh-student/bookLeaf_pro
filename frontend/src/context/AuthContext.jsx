import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true)
        
        // First check localStorage
        const storedUser = localStorage.getItem('bookleaf_user')
        if (storedUser) {
          console.log('🔐 AuthContext: Restoring user from localStorage')
          const user = JSON.parse(storedUser)
          console.log('🔐 AuthContext: Restored user._id:', user._id, 'role:', user.role)
          setUser(user)
          setError(null)
          setLoading(false)
          
          // Silently try to verify with backend, but don't fail if it doesn't work
          try {
            const freshData = await authAPI.me()
            console.log('🔐 AuthContext: Verified user with backend')
            setUser(freshData)
            localStorage.setItem('bookleaf_user', JSON.stringify(freshData))
          } catch (err) {
            console.log('🔐 AuthContext: Backend verification failed, but using localStorage user')
            // Don't clear localStorage - user is still valid from localStorage
          }
          return
        }

        // If not in localStorage, try to fetch from API
        const userData = await authAPI.me()
        console.log('🔐 AuthContext: Got user from API, _id:', userData._id)
        setUser(userData)
        localStorage.setItem('bookleaf_user', JSON.stringify(userData))
        setError(null)
      } catch (err) {
        console.log('🔐 AuthContext: Not authenticated -', err.message)
        setUser(null)
        localStorage.removeItem('bookleaf_user')
        setError(null) // Don't show error on initial check
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      setLoading(true)
      setError(null)
      const userData = await authAPI.login(email, password)
      console.log('🔐 AuthContext: User logged in')
      console.log('🔐 AuthContext: User._id:', userData._id)
      console.log('🔐 AuthContext: User.role:', userData.role)
      console.log('🔐 AuthContext: Full user object:', userData)
      setUser(userData)
      localStorage.setItem('bookleaf_user', JSON.stringify(userData))
      return userData
    } catch (err) {
      console.error('🔐 AuthContext: Login failed:', err.message)
      setError(err.message)
      setUser(null)
      localStorage.removeItem('bookleaf_user')
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      setLoading(true)
      await authAPI.logout()
      console.log('🔐 AuthContext: User logged out')
      setUser(null)
      localStorage.removeItem('bookleaf_user')
      setError(null)
    } catch (err) {
      console.error('🔐 AuthContext: Logout failed:', err.message)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!user,
    isAuthor: user?.role === 'author',
    isAdmin: user?.role === 'admin',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

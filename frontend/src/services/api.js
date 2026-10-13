const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export const apiClient = {
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    console.log('API Request:', { url, method: options.method || 'GET' })
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    const data = await response.json()
    console.log('API Response:', { url, status: response.status, data })

    if (!response.ok) {
      const error = new Error(data.error?.message || 'An error occurred')
      error.code = data.error?.code
      error.statusCode = response.status
      throw error
    }

    return data.data
  },

  get(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'GET' })
  },

  post(endpoint, body, options) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  patch(endpoint, body, options) {
    return this.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete(endpoint, options) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  },
}

// Auth endpoints
export const authAPI = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password })
    console.log('Login response:', response)
    return response.user
  },
  logout: () => apiClient.post('/auth/logout', {}),
  me: async () => {
    try {
      const response = await apiClient.get('/auth/me')
      return response.user
    } catch (err) {
      // Not authenticated is expected on initial load
      throw err
    }
  },
}

// Author endpoints
export const authorAPI = {
  getDashboard: () => apiClient.get('/author/dashboard'),
  getBooks: () => apiClient.get('/author/books'),
  getTickets: (filters) => {
    const params = new URLSearchParams(filters).toString()
    return apiClient.get(`/author/tickets${params ? `?${params}` : ''}`)
  },
  createTicket: (data) => apiClient.post('/author/tickets', data),
  getTicketDetail: (ticketId) => apiClient.get(`/author/tickets/${ticketId}`),
}

// Admin endpoints
export const adminAPI = {
  getTickets: (filters) => {
    const params = new URLSearchParams(filters).toString()
    return apiClient.get(`/admin/tickets${params ? `?${params}` : ''}`)
  },
  getTicketDetail: (ticketId) => apiClient.get(`/admin/tickets/${ticketId}`),
  updateTicket: (ticketId, data) => apiClient.patch(`/admin/tickets/${ticketId}`, data),
  assignToSelf: (ticketId) => apiClient.post(`/admin/tickets/${ticketId}/assign-self`, {}),
  addMessage: (ticketId, data) => apiClient.post(`/admin/tickets/${ticketId}/messages`, data),
  generateAIDraft: (ticketId) => apiClient.post(`/admin/tickets/${ticketId}/ai-draft`, {}),
}

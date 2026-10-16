import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Log environment variables for debugging
console.log('Frontend Environment:')
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL)
console.log('Socket URL:', import.meta.env.VITE_SOCKET_URL)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


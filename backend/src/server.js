const config = require('./config/config')
const connectToDB = require('./config/database')
const createApp = require('./app')
const http = require('http')

const startServer = async () => {
  await connectToDB()
  const app = createApp()
  const server = http.createServer(app)

  // Initialize Socket.IO if available
  try {
    try {
      const socketIO = require('socket.io')
      const io = new socketIO(server, {
        cors: {
          origin: config.CLIENT_URL,
          methods: ['GET', 'POST'],
          credentials: true,
        },
      })

      const setupTicketSocket = require('./sockets/ticket.socket')
      setupTicketSocket(io)

      console.log('[Socket.IO] Initialized')
    } catch (err) {
      console.warn('[Socket.IO] Not installed: npm install socket.io')
    }
  } catch (error) {
    console.warn('[Socket.IO] Error:', error.message)
  }

  server.listen(config.PORT, () => {
    console.log(`Server is running on port ${config.PORT}`)
    try {
      const aiService = require('./services/ai.service').getInstance()
      console.log(`[AI Service] ${aiService.getStatus().available ? 'Google Gemini available' : 'Using mock classification (Gemini API key not configured)'}`)
    } catch (e) {
      console.warn('[AI Service] Error:', e.message)
    }
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})


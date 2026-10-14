const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const config = require('./config/config')
require('./models')
const apiRouter = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const createApp = () => {
  const app = express()

  // CORS configuration for cookies
  app.use(
    cors({
      origin: config.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['Content-Type'],
    })
  )
  
  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      data: { status: 'ok' },
    })
  })

  // AI status endpoint
  app.get('/ai/status', (req, res) => {
    const aiService = require('./services/ai.service').getInstance()
    res.status(200).json({
      success: true,
      data: aiService.getStatus(),
    })
  })

  app.use('/api/v1', apiRouter)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp

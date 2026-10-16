const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const path = require('path')
const config = require('./config/config')
require('./models')
const apiRouter = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const createApp = () => {
  const app = express()

  // CORS MUST be set up FIRST, before any routes
  app.use(cors({
    origin: '*',
    credentials: false,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS', 'PUT', 'HEAD'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  }))

  // Handle preflight requests
  app.options('*', cors())

  // Manual CORS headers as fallback
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS, PUT, HEAD')
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.header('Access-Control-Expose-Headers', 'Content-Type, Authorization')
    next()
  })

  app.use(express.json({ limit: '1mb' }))
  app.use(cookieParser())

  // Note: Vercel has ephemeral filesystem - files deleted after each request
  // For production file uploads, use S3, Cloudinary, or similar
  // Commented out for Vercel compatibility
  // app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'BookLeaf Author Support Portal API',
      version: '1.0.0',
      endpoints: {
        health: '/health',
        api: '/api/v1',
      },
    })
  })

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

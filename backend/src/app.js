const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const env = require('./config/env')
require('./models')
const apiRouter = require('./routes')
const notFound = require('./middleware/notFound')
const errorHandler = require('./middleware/errorHandler')

const createApp = () => {
  const app = express()

  // CORS configuration for cookies
  app.use(
    cors({
      origin: env.CLIENT_URL,
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

  app.use('/api/v1', apiRouter)
  app.use(notFound)
  app.use(errorHandler)

  return app
}

module.exports = createApp

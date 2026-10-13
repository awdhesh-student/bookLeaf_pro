const env = require('../config/env')

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }

  let statusCode = err.statusCode || 500
  let code = err.code || 'INTERNAL_ERROR'
  let message = err.isOperational ? err.message : 'Unexpected server failure.'

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = 'Invalid JSON body.'
  }

  if (err.name === 'ZodError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = err.issues?.[0]?.message || 'Invalid request.'
  }

  if (err.name === 'ValidationError') {
    statusCode = 400
    code = 'VALIDATION_ERROR'
    message = Object.values(err.errors || {})
      .map((item) => item.message)
      .join(' ') || 'Invalid request.'
  }

  if (err.code === 11000) {
    statusCode = 409
    code = 'CONFLICT'
    message = 'A record with that value already exists.'
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401
    code = 'UNAUTHENTICATED'
    message = 'Authentication required.'
  }

  if (statusCode >= 500 && env.NODE_ENV !== 'test') {
    console.error(err)
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  })
}

module.exports = errorHandler

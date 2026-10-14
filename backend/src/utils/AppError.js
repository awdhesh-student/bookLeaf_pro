/**
 * Create a custom application error (functional approach)
 */
const createAppError = (message, options = {}) => {
  const { statusCode = 500, code = 'INTERNAL_ERROR' } = options

  const error = new Error(message)
  error.name = 'AppError'
  error.statusCode = statusCode
  error.code = code
  error.isOperational = true

  return error
}

/**
 * Check if error is AppError
 */
const isAppError = (error) => {
  return error && error.name === 'AppError'
}

module.exports = createAppError
module.exports.isAppError = isAppError

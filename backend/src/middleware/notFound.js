const AppError = require('../utils/AppError')

const notFound = (req, res, next) => {
  next(
    AppError(`Route ${req.method} ${req.originalUrl} was not found.`, {
      statusCode: 404,
      code: 'NOT_FOUND',
    })
  )
}

module.exports = notFound

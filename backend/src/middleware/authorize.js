const AppError = require('../utils/AppError')
const asyncHandler = require('../utils/asyncHandler')

const authorize = (...allowedRoles) => asyncHandler((req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    throw AppError('You do not have permission to perform this action.', {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  }

  next()
})

module.exports = authorize

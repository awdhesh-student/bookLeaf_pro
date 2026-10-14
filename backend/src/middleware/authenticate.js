const config = require('../config/config')
const User = require('../models/User')
const AppError = require('../utils/AppError')
const asyncHandler = require('../utils/asyncHandler')
const { verifyAccessToken } = require('../utils/jwt')

const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.[config.COOKIE_NAME]

  if (!token) {
    throw AppError('Authentication required.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    })
  }

  const payload = verifyAccessToken(token)
  const user = await User.findById(payload.sub)

  if (!user || !user.isActive) {
    throw AppError('Authentication required.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    })
  }

  req.user = user
  req.auth = {
    userId: user._id,
    role: user.role,
    authorId: user.authorId,
  }

  next()
})

module.exports = authenticate

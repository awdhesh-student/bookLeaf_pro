const bcrypt = require('bcrypt')
const User = require('../models/User')
const AppError = require('../utils/AppError')
const { signAccessToken } = require('../utils/jwt')

const GENERIC_AUTH_ERROR = 'Invalid email or password.'

const normalizeEmail = (email) => String(email).trim().toLowerCase()

const login = async ({ email, password }) => {
  const user = await User.findOne({ email: normalizeEmail(email) }).select('+passwordHash')

  if (!user || !user.isActive) {
    throw AppError(GENERIC_AUTH_ERROR, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    })
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash)
  if (!passwordMatches) {
    throw AppError(GENERIC_AUTH_ERROR, {
      statusCode: 401,
      code: 'INVALID_CREDENTIALS',
    })
  }

  const token = signAccessToken({
    sub: String(user._id),
    role: user.role,
    authorId: user.authorId,
  })

  return {
    token,
    user: user.toPublicJSON(),
  }
}

const getCurrentUser = async (userId) => {
  const user = await User.findById(userId)
  if (!user || !user.isActive) {
    throw AppError('Authentication required.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    })
  }

  return user.toPublicJSON()
}

module.exports = {
  login,
  getCurrentUser,
}

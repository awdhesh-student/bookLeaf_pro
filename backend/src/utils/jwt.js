const jwt = require('jsonwebtoken')
const config = require('../config/config')
const AppError = require('./AppError')

const signAccessToken = (payload) => {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN })
}

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.JWT_SECRET)
  } catch {
    throw AppError('Authentication required.', {
      statusCode: 401,
      code: 'UNAUTHENTICATED',
    })
  }
}

const parseDurationToMs = (value) => {
  if (/^\d+$/.test(value)) {
    return Number(value) * 1000
  }

  const match = String(value).match(/^(\d+)([smhd])$/)
  if (!match) {
    return 24 * 60 * 60 * 1000
  }

  const amount = Number(match[1])
  const unit = match[2]
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }

  return amount * multipliers[unit]
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  parseDurationToMs,
}

const config = require('../config/config')
const { parseDurationToMs } = require('./jwt')

const cookieOptions = () => {
  const isProduction = config.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseDurationToMs(config.JWT_EXPIRES_IN),
    path: '/',
  }
}

const setAuthCookie = (res, token) => {
  res.cookie(config.COOKIE_NAME, token, cookieOptions())
}

const clearAuthCookie = (res) => {
  res.clearCookie(config.COOKIE_NAME, {
    ...cookieOptions(),
    maxAge: 0,
  })
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
}

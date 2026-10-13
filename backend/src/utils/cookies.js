const env = require('../config/env')
const { parseDurationToMs } = require('./jwt')

const cookieOptions = () => {
  const isProduction = env.NODE_ENV === 'production'

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: parseDurationToMs(env.JWT_EXPIRES_IN),
    path: '/',
  }
}

const setAuthCookie = (res, token) => {
  res.cookie(env.COOKIE_NAME, token, cookieOptions())
}

const clearAuthCookie = (res) => {
  res.clearCookie(env.COOKIE_NAME, {
    ...cookieOptions(),
    maxAge: 0,
  })
}

module.exports = {
  setAuthCookie,
  clearAuthCookie,
}

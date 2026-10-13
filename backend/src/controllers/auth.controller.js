const authService = require('../services/auth.service')
const asyncHandler = require('../utils/asyncHandler')
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies')

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body
  const { token, user } = await authService.login({ email, password })

  console.log("login successfull")
  setAuthCookie(res, token)

  res.status(200).json({
    success: true,
    data: { user },
  })
})

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res)

  res.status(200).json({
    success: true,
    data: { message: 'Logged out successfully.' },
  })
})

const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id)

  res.status(200).json({
    success: true,
    data: { user },
  })
})

module.exports = {
  login,
  logout,
  me,
}

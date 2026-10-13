const express = require('express')
const rateLimit = require('express-rate-limit')
const authController = require('../controllers/auth.controller')
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/validate')
const { loginSchema } = require('../validators/auth.validator')
const AppError = require('../utils/AppError')

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(
      new AppError('Too many login attempts. Please try again later.', {
        statusCode: 429,
        code: 'RATE_LIMIT',
      })
    )
  },
})

router.post('/login', loginLimiter, validate(loginSchema), authController.login)
router.post('/logout', authController.logout)
router.get('/me', authenticate, authController.me)

module.exports = router

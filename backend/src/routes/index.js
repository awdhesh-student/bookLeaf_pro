const express = require('express')
const authRoutes = require('./auth.routes')
const authorRoutes = require('./author.routes')
const adminRoutes = require('./admin.routes')

const router = express.Router()

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'ok' },
  })
})

router.use('/auth', authRoutes)
router.use('/author', authorRoutes)
router.use('/admin', adminRoutes)

module.exports = router

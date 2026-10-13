const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const authorController = require('../controllers/author.controller')
const { createTicketSchema } = require('../validators/author.validator')

const router = express.Router()

// All author routes require authentication and author role
router.use(authenticate)
router.use(authorize('author'))

router.get('/dashboard', authorController.getDashboard)
router.get('/books', authorController.getBooks)
router.get('/tickets', authorController.getTickets)
router.post('/tickets', validate(createTicketSchema), authorController.createTicket)
router.get('/tickets/:id', authorController.getTicketDetail)

module.exports = router

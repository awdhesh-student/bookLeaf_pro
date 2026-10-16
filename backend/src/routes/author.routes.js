const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const authorController = require('../controllers/author.controller')
const { createTicketSchema, addPublicReplySchema } = require('../validators/author.validator')
const { upload, handleUploadError } = require('../middleware/upload')

const router = express.Router()

// All author routes require authentication and author role
router.use(authenticate)
router.use(authorize('author'))

// Dashboard
router.get('/dashboard', authorController.getDashboard)

// Books
router.get('/books', authorController.getBooks)
router.get('/books/stats', authorController.getBookStats)
router.get('/books/export/csv', authorController.exportBooksCSV)
router.get('/books/export/json', authorController.exportBooksJSON)

// Tickets - special routes first
router.get('/tickets/search', authorController.searchTickets)
router.get('/tickets/export/csv', authorController.exportTicketsCSV)
router.get('/tickets/export/json', authorController.exportTicketsJSON)

// Tickets - general
router.get('/tickets', authorController.getTickets)
router.post('/tickets', validate(createTicketSchema), authorController.createTicket)

// Ticket detail
router.get('/tickets/:id', authorController.getTicketDetail)
router.post('/tickets/:id/reply', validate(addPublicReplySchema), authorController.addPublicReply)
router.post(
  '/tickets/:id/reply-with-attachment',
  upload.array('attachments', 5),
  handleUploadError,
  authorController.addPublicReplyWithAttachment
)
router.get('/tickets/:id/files/:messageId/:fileName', authorController.downloadFile)

module.exports = router

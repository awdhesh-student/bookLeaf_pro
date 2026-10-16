const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const adminController = require('../controllers/admin.controller')
const { updateTicketSchema, addMessageSchema, bulkUpdateTicketsSchema } = require('../validators/admin.validator')
const { upload, handleUploadError } = require('../middleware/upload')

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(authorize('admin'))

// Special routes (must come before :id route)
router.get('/tickets/search', adminController.searchTickets)
router.get('/tickets/stats', adminController.getStatistics)
router.get('/tickets/by-author', adminController.getTicketsByAuthor)
router.post('/tickets/bulk-update', validate(bulkUpdateTicketsSchema), adminController.bulkUpdateTickets)
router.get('/tickets/export/csv', adminController.exportTicketsCSV)
router.get('/tickets/export/json', adminController.exportTicketsJSON)

// General ticket list
router.get('/tickets', adminController.getTickets)

// Detail and modifications for specific ticket
router.get('/tickets/:id', adminController.getTicketDetail)
router.patch('/tickets/:id', validate(updateTicketSchema), adminController.updateTicket)
router.post('/tickets/:id/assign-self', adminController.assignToSelf)
router.post('/tickets/:id/messages', validate(addMessageSchema), adminController.addMessage)
router.post(
  '/tickets/:id/messages/with-attachment',
  upload.array('attachments', 5),
  handleUploadError,
  adminController.addMessageWithAttachment
)
router.get('/tickets/:id/files/:messageId/:fileName', adminController.downloadFile)
router.post('/tickets/:id/ai-draft', adminController.generateAIDraft)
router.post('/tickets/:id/ai-classify', adminController.classifyTicketWithAI)

module.exports = router


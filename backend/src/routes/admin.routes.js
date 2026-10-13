const express = require('express')
const authenticate = require('../middleware/authenticate')
const authorize = require('../middleware/authorize')
const validate = require('../middleware/validate')
const adminController = require('../controllers/admin.controller')
const { updateTicketSchema, addMessageSchema } = require('../validators/admin.validator')

const router = express.Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(authorize('admin'))

router.get('/tickets', adminController.getTickets)
router.get('/tickets/:id', adminController.getTicketDetail)
router.patch('/tickets/:id', validate(updateTicketSchema), adminController.updateTicket)
router.post('/tickets/:id/assign-self', adminController.assignToSelf)
router.post('/tickets/:id/messages', validate(addMessageSchema), adminController.addMessage)
router.post('/tickets/:id/ai-draft', adminController.generateAIDraft)

module.exports = router

const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const Book = require('../models/Book')
const AuthorProfile = require('../models/AuthorProfile')
const { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, MESSAGE_TYPES } = require('../constants')
const ticketService = require('../services/ticket.service')

// GET /api/v1/admin/tickets
const getTickets = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const result = await ticketService.getPaginatedTickets(req.query, parseInt(page), parseInt(limit))

  res.status(200).json({
    success: true,
    data: result.tickets,
    pagination: result.pagination,
  })
})

// GET /api/v1/admin/tickets/:id
const getTicketDetail = asyncHandler(async (req, res) => {
  const { id } = req.params

  const ticket = await Ticket.findById(id).lean()

  if (!ticket) {
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Get all messages (public and internal)
  const messages = await TicketMessage.find({ ticketId: ticket._id })
    .sort({ createdAt: 1 })
    .lean()

  // Populate author email and book title
  const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
  const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null

  res.status(200).json({
    success: true,
    data: {
      ...ticket,
      authorEmail: authorProfile?.email || 'Unknown',
      bookTitle: bookDetails?.title || null,
      messages,
    },
  })
})

// PATCH /api/v1/admin/tickets/:id
const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status, priority, category, assignedAdminId } = req.validated.body

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Validate and update status
  if (status !== undefined) {
    if (!TICKET_STATUSES.includes(status)) {
      throw new AppError('Invalid status.', {
        statusCode: 400,
        code: 'INVALID_STATUS',
      })
    }
    ticket.status = status
  }

  // Validate and update priority
  if (priority !== undefined) {
    if (!TICKET_PRIORITIES.includes(priority)) {
      throw new AppError('Invalid priority.', {
        statusCode: 400,
        code: 'INVALID_PRIORITY',
      })
    }
    // Only override if not already set by admin
    if (ticket.prioritySource !== 'admin') {
      ticket.priority = priority
      ticket.prioritySource = 'admin'
    }
  }

  // Validate and update category
  if (category !== undefined) {
    if (!TICKET_CATEGORIES.includes(category)) {
      throw new AppError('Invalid category.', {
        statusCode: 400,
        code: 'INVALID_CATEGORY',
      })
    }
    // Only override if not already set by admin
    if (ticket.categorySource !== 'admin') {
      ticket.category = category
      ticket.categorySource = 'admin'
    }
  }

  // Update assigned admin
  if (assignedAdminId !== undefined) {
    ticket.assignedAdminId = assignedAdminId || null
  }

  await ticket.save()

  // Populate response
  const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
  const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null
  const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean()

  res.status(200).json({
    success: true,
    data: {
      ...ticket.toObject(),
      authorEmail: authorProfile?.email || 'Unknown',
      bookTitle: bookDetails?.title || null,
      messages,
    },
  })
})

// POST /api/v1/admin/tickets/:id/assign-self
const assignToSelf = asyncHandler(async (req, res) => {
  const { id } = req.params
  const adminId = req.user._id

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  ticket.assignedAdminId = adminId
  await ticket.save()

  const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
  const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null
  const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean()

  res.status(200).json({
    success: true,
    data: {
      ...ticket.toObject(),
      authorEmail: authorProfile?.email || 'Unknown',
      bookTitle: bookDetails?.title || null,
      messages,
    },
  })
})

// POST /api/v1/admin/tickets/:id/messages
const addMessage = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { body, type } = req.validated.body
  const adminId = req.user._id

  // Validate message type
  if (!Object.values(MESSAGE_TYPES).includes(type)) {
    throw new AppError('Invalid message type.', {
      statusCode: 400,
      code: 'INVALID_MESSAGE_TYPE',
    })
  }

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  const message = new TicketMessage({
    ticketId: ticket._id,
    senderId: adminId,
    senderRole: 'admin',
    type,
    body,
  })

  await message.save()

  // Return updated ticket with all messages
  const allMessages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean()
  const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
  const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null

  res.status(201).json({
    success: true,
    data: {
      ...ticket.toObject(),
      authorEmail: authorProfile?.email || 'Unknown',
      bookTitle: bookDetails?.title || null,
      messages: allMessages,
    },
  })
})

// POST /api/v1/admin/tickets/:id/ai-draft
const generateAIDraft = asyncHandler(async (req, res) => {
  const { id } = req.params

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Placeholder for AI integration (Day 3)
  ticket.aiDraft = 'AI draft generation coming in Day 3.'
  ticket.aiProcessingStatus = 'idle'

  await ticket.save()

  const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
  const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null
  const messages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean()

  res.status(200).json({
    success: true,
    data: {
      ...ticket.toObject(),
      authorEmail: authorProfile?.email || 'Unknown',
      bookTitle: bookDetails?.title || null,
      messages,
    },
  })
})

// POST /api/v1/admin/tickets/search
const searchTickets = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query

  if (!search || search.trim().length === 0) {
    throw new AppError('Search term is required.', {
      statusCode: 400,
      code: 'SEARCH_TERM_REQUIRED',
    })
  }

  const result = await ticketService.searchTickets(search, req.query, parseInt(page), parseInt(limit))

  res.status(200).json({
    success: true,
    data: result.tickets,
    pagination: result.pagination,
  })
})

// GET /api/v1/admin/tickets/stats
const getStatistics = asyncHandler(async (req, res) => {
  const stats = await ticketService.getTicketStatistics(req.query)

  res.status(200).json({
    success: true,
    data: stats,
  })
})

// GET /api/v1/admin/tickets/by-author
const getTicketsByAuthor = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const result = await ticketService.getTicketsByAuthor(parseInt(page), parseInt(limit))

  res.status(200).json({
    success: true,
    data: result.authorStats,
    pagination: result.pagination,
  })
})

// POST /api/v1/admin/tickets/export/csv
const exportTicketsCSV = asyncHandler(async (req, res) => {
  const csv = await ticketService.exportTicketsToCSV(req.query)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"')
  res.status(200).send(csv)
})

// POST /api/v1/admin/tickets/export/json
const exportTicketsJSON = asyncHandler(async (req, res) => {
  const data = await ticketService.exportTicketsToJSON(req.query)

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.json"')
  res.status(200).json(data)
})

// POST /api/v1/admin/tickets/bulk-update
const bulkUpdateTickets = asyncHandler(async (req, res) => {
  const { ticketIds, updates } = req.validated.body

  if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
    throw new AppError('Please provide at least one ticket ID.', {
      statusCode: 400,
      code: 'INVALID_TICKET_IDS',
    })
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw new AppError('Please provide at least one field to update.', {
      statusCode: 400,
      code: 'NO_UPDATES_PROVIDED',
    })
  }

  const result = await ticketService.bulkUpdateTickets(ticketIds, updates)

  res.status(200).json({
    success: true,
    data: {
      message: `Updated ${result.modifiedCount} ticket(s)`,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    },
  })
})

module.exports = {
  getTickets,
  getTicketDetail,
  updateTicket,
  assignToSelf,
  addMessage,
  generateAIDraft,
  searchTickets,
  getStatistics,
  getTicketsByAuthor,
  exportTicketsCSV,
  exportTicketsJSON,
  bulkUpdateTickets,
}

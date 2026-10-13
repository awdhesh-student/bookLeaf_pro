const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const Book = require('../models/Book')
const AuthorProfile = require('../models/AuthorProfile')
const { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, MESSAGE_TYPES } = require('../constants')

const SORT_WHITELIST = ['createdAt', 'priority', 'status']

// GET /api/v1/admin/tickets
const getTickets = asyncHandler(async (req, res) => {
  const { status, priority, category, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query

  const query = {}

  if (status) {
    query.status = status
  }

  if (priority) {
    query.priority = priority
  }

  if (category) {
    query.category = category
  }

  // Validate sort field
  const sortField = SORT_WHITELIST.includes(sort) ? sort : 'createdAt'
  const sortOrder = order === 'asc' ? 1 : -1

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const tickets = await Ticket.find(query)
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(parseInt(limit))
    .lean()

  // Populate author emails and book titles
  for (const ticket of tickets) {
    const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
    ticket.authorEmail = authorProfile?.email || 'Unknown'

    if (ticket.bookId) {
      const book = await Book.findOne({ bookId: ticket.bookId }).lean()
      ticket.bookTitle = book?.title || null
    } else {
      ticket.bookTitle = null
    }
  }

  const total = await Ticket.countDocuments(query)

  res.status(200).json({
    success: true,
    data: tickets,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit)),
    },
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

module.exports = {
  getTickets,
  getTicketDetail,
  updateTicket,
  assignToSelf,
  addMessage,
  generateAIDraft,
}

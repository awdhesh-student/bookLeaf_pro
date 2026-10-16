const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const AuthorProfile = require('../models/AuthorProfile')
const Book = require('../models/Book')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const { TICKET_CATEGORIES } = require('../constants')
const ticketService = require('../services/ticket.service')
const bookService = require('../services/book.service')

// GET /api/v1/author/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const [books, openTickets] = await Promise.all([
    Book.find({ authorId }),
    Ticket.find({ authorId, status: 'Open' }),
  ])

  const publishedBooks = books.filter((book) => book.status === 'Published & Live').length
  const totalRoyaltyEarned = books.reduce((sum, book) => sum + book.totalRoyaltyEarned, 0)
  const royaltyPaid = books.reduce((sum, book) => sum + book.royaltyPaid, 0)
  const royaltyPending = books.reduce((sum, book) => sum + book.royaltyPending, 0)

  res.status(200).json({
    success: true,
    data: {
      totalBooks: books.length,
      publishedBooks,
      totalRoyaltyEarned,
      royaltyPaid,
      royaltyPending,
      openTickets: openTickets.length,
    },
  })
})

// GET /api/v1/author/books
const getBooks = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { search, status, page = 1, limit = 10 } = req.query

  const result = await bookService.searchBooks(
    authorId,
    search,
    { status },
    parseInt(page),
    parseInt(limit)
  )

  res.status(200).json({
    success: true,
    data: result.books,
    pagination: result.pagination,
  })
})

// GET /api/v1/author/tickets
const getTickets = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { page = 1, limit = 10 } = req.query

  const query = { ...req.query, authorId }
  const result = await ticketService.getPaginatedTickets(query, parseInt(page), parseInt(limit))

  res.status(200).json({
    success: true,
    data: result.tickets,
    pagination: result.pagination,
  })
})

// POST /api/v1/author/tickets
const createTicket = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { subject, description, category, bookId } = req.validated.body
  const aiService = require('../services/ai.service').getInstance()

  // Validate bookId if provided
  if (bookId) {
    const book = await Book.findOne({ bookId, authorId })
    if (!book) {
      throw AppError('Book not found or does not belong to you.', {
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
      })
    }
  }

  // Validate category
  if (!TICKET_CATEGORIES.includes(category)) {
    throw AppError('Invalid category.', {
      statusCode: 400,
      code: 'INVALID_CATEGORY',
    })
  }

  // Generate ticket number
  const count = await Ticket.countDocuments()
  const ticketNumber = `BL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const ticket = new Ticket({
    ticketNumber,
    authorId,
    bookId: bookId || null,
    subject,
    description,
    category,
    status: 'Open',
    priority: 'Medium',
    categorySource: 'ai',
    prioritySource: 'ai',
    aiProcessingStatus: 'pending',
  })

  await ticket.save()

  // Trigger AI classification asynchronously (non-blocking)
  if (aiService.isServiceAvailable()) {
    try {
      const classification = await aiService.classifyTicket(ticket)
      ticket.category = classification.category
      ticket.priority = classification.priority
      ticket.aiProcessingStatus = 'completed'
    } catch (error) {
      console.warn('[Ticket Creation] AI Classification failed:', error.message)
      ticket.aiProcessingStatus = 'failed'
      ticket.aiErrorCode = error.code || 'UNKNOWN_ERROR'
    }
    await ticket.save()
  } else {
    // Use mock classification
    const mockClassification = aiService.getMockClassification(ticket)
    ticket.category = mockClassification.category
    ticket.priority = mockClassification.priority
    ticket.aiProcessingStatus = 'completed'
    await ticket.save()
  }

  res.status(201).json({
    success: true,
    data: ticket,
  })
})

// GET /api/v1/author/tickets/:id
const getTicketDetail = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { id } = req.params

  const ticket = await Ticket.findById(id).lean()

  if (!ticket) {
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  if (ticket.authorId !== authorId) {
    throw AppError('You do not have access to this ticket.', {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  }

  // Get public messages only
  const messages = await TicketMessage.find({
    ticketId: ticket._id,
    type: 'public_reply',
  })
    .sort({ createdAt: 1 })
    .lean()

  // Populate book title
  let bookTitle = null
  if (ticket.bookId) {
    const book = await Book.findOne({ bookId: ticket.bookId }).lean()
    bookTitle = book?.title || null
  }

  res.status(200).json({
    success: true,
    data: {
      ...ticket,
      bookTitle,
      messages,
    },
  })
})

// GET /api/v1/author/tickets/search
const searchTickets = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { search, page = 1, limit = 10 } = req.query

  if (!search || search.trim().length === 0) {
    throw AppError('Search term is required.', {
      statusCode: 400,
      code: 'SEARCH_TERM_REQUIRED',
    })
  }

  const result = await ticketService.searchTickets(search, { authorId }, parseInt(page), parseInt(limit))

  res.status(200).json({
    success: true,
    data: result.tickets,
    pagination: result.pagination,
  })
})

// GET /api/v1/author/books/stats
const getBookStats = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const stats = await bookService.getBookStatistics(authorId)

  res.status(200).json({
    success: true,
    data: stats,
  })
})

// GET /api/v1/author/books/export/csv
const exportBooksCSV = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const csv = await bookService.exportBooksToCSV(authorId, req.query)

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="books.csv"')
  res.status(200).send(csv)
})

// GET /api/v1/author/books/export/json
const exportBooksJSON = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const data = await bookService.exportBooksToJSON(authorId, req.query)

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="books.json"')
  res.status(200).json(data)
})

// GET /api/v1/author/tickets/export/csv
const exportTicketsCSV = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const csv = await ticketService.exportTicketsToCSV({ ...req.query, authorId })

  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.csv"')
  res.status(200).send(csv)
})

// GET /api/v1/author/tickets/export/json
const exportTicketsJSON = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId

  const data = await ticketService.exportTicketsToJSON({ ...req.query, authorId })

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', 'attachment; filename="tickets.json"')
  res.status(200).json(data)
})

// POST /api/v1/author/tickets/:id/reply
const addPublicReply = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { id } = req.params
  const { body } = req.validated.body

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  if (ticket.authorId !== authorId) {
    throw AppError('You do not have access to this ticket.', {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  }

  const message = new TicketMessage({
    ticketId: ticket._id,
    senderId: req.user._id,
    senderRole: 'author',
    type: 'public_reply',
    body,
  })

  await message.save()

  // Fetch all public messages
  const messages = await TicketMessage.find({
    ticketId: ticket._id,
    type: 'public_reply',
  })
    .sort({ createdAt: 1 })
    .lean()

  // Return full ticket object for consistency with admin endpoint
  let bookTitle = null
  if (ticket.bookId) {
    const book = await Book.findOne({ bookId: ticket.bookId }).lean()
    bookTitle = book?.title || null
  }

  res.status(201).json({
    success: true,
    data: {
      ...ticket.toObject(),
      bookTitle,
      messages,
    },
  })
})

// POST /api/v1/author/tickets/:id/reply-with-attachment
const addPublicReplyWithAttachment = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { id } = req.params
  const { body } = req.body
  const FileService = require('../services/file.service')

  // Validate message body
  if (!body || body.trim().length === 0) {
    // Clean up files
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }
    throw AppError('Reply body is required.', {
      statusCode: 400,
      code: 'EMPTY_REPLY_BODY',
    })
  }

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    // Clean up files
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  if (ticket.authorId !== authorId) {
    // Clean up files
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }
    throw AppError('You do not have access to this ticket.', {
      statusCode: 403,
      code: 'FORBIDDEN',
    })
  }

  try {
    // Extract file metadata
    const attachments = FileService.extractFileMetadata(req.files)

    // Create message with attachments
    const message = new TicketMessage({
      ticketId: ticket._id,
      senderId: req.user._id,
      senderRole: 'author',
      type: 'public_reply',
      body: body.trim(),
      attachments,
    })

    await message.save()

    // Broadcast via Socket.IO if available
    const io = global.io
    if (io) {
      io.to(`ticket:${id}`).emit('message:created', {
        ticketId: id.toString(),
        message: {
          _id: message._id,
          body: message.body,
          senderRole: message.senderRole,
          type: message.type,
          senderId: message.senderId,
          attachments: message.attachments,
          createdAt: message.createdAt,
          updatedAt: message.updatedAt,
        },
      })
    }

    // Fetch all public messages
    const messages = await TicketMessage.find({
      ticketId: ticket._id,
      type: 'public_reply',
    })
      .sort({ createdAt: 1 })
      .lean()

    // Return full ticket object for consistency
    let bookTitle = null
    if (ticket.bookId) {
      const book = await Book.findOne({ bookId: ticket.bookId }).lean()
      bookTitle = book?.title || null
    }

    res.status(201).json({
      success: true,
      data: {
        ...ticket.toObject(),
        bookTitle,
        messages,
      },
    })
  } catch (error) {
    // Clean up files on error
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }
    throw error
  }
})

// GET /api/v1/author/tickets/:id/files/:messageId/:fileName
const downloadFile = asyncHandler(async (req, res) => {
  const { id: ticketId, messageId, fileName } = req.params
  const authorId = req.user.authorId

  // Verify ticket exists and belongs to this author
  const ticket = await Ticket.findById(ticketId)
  if (!ticket || ticket.authorId.toString() !== authorId) {
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Verify message exists
  const message = await TicketMessage.findById(messageId)
  if (!message || message.ticketId.toString() !== ticketId) {
    throw AppError('Message not found.', {
      statusCode: 404,
      code: 'MESSAGE_NOT_FOUND',
    })
  }

  // Find the file in attachments
  const attachment = message.attachments.find((a) => a.fileName === decodeURIComponent(fileName))

  if (!attachment) {
    throw AppError('File not found.', {
      statusCode: 404,
      code: 'FILE_NOT_FOUND',
    })
  }

  // For local development: send file from uploads folder
  // For production (Vercel): would need cloud storage
  const path = require('path')
  const fs = require('fs')
  const filePath = path.join(__dirname, `../../uploads/${attachment.filePath.split('/').pop()}`)

  if (fs.existsSync(filePath)) {
    res.download(filePath, attachment.fileName)
  } else {
    throw AppError('File not available for download.', {
      statusCode: 410,
      code: 'FILE_UNAVAILABLE',
    })
  }
})

module.exports = {
  getDashboard,
  getBooks,
  getTickets,
  createTicket,
  getTicketDetail,
  addPublicReply,
  addPublicReplyWithAttachment,
  downloadFile,
  searchTickets,
  getBookStats,
  exportBooksCSV,
  exportBooksJSON,
  exportTicketsCSV,
  exportTicketsJSON,
}

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
    throw AppError('Ticket not found.', {
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
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Validate and update status
  if (status !== undefined) {
    if (!TICKET_STATUSES.includes(status)) {
      throw AppError('Invalid status.', {
        statusCode: 400,
        code: 'INVALID_STATUS',
      })
    }
    ticket.status = status
  }

  // Validate and update priority
  if (priority !== undefined) {
    if (!TICKET_PRIORITIES.includes(priority)) {
      throw AppError('Invalid priority.', {
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
      throw AppError('Invalid category.', {
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
    throw AppError('Ticket not found.', {
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
    throw AppError('Invalid message type.', {
      statusCode: 400,
      code: 'INVALID_MESSAGE_TYPE',
    })
  }

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw AppError('Ticket not found.', {
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
  const aiService = require('../services/ai.service').getInstance()

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Mark as processing
  ticket.aiProcessingStatus = 'pending'
  await ticket.save()

  try {
    // Get author and book details
    const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
    const bookDetails = ticket.bookId ? await Book.findOne({ bookId: ticket.bookId }).lean() : null

    // Get recent public messages for context
    const recentMessages = await TicketMessage.find({
      ticketId: ticket._id,
      type: 'public_reply',
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()

    const recentHistory = recentMessages
      .reverse()
      .map((msg) => `[${msg.createdAt}] ${msg.body}`)
      .join('\n')

    // Generate draft
    const draftResult = await aiService.generateDraft(ticket, authorProfile, bookDetails, recentHistory)

    // Save draft
    ticket.aiDraft = draftResult.draft
    ticket.aiProcessingStatus = 'completed'
    ticket.aiErrorCode = null

    await ticket.save()

    const allMessages = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 }).lean()

    res.status(200).json({
      success: true,
      data: {
        ...ticket.toObject(),
        authorEmail: authorProfile?.email || 'Unknown',
        bookTitle: bookDetails?.title || null,
        messages: allMessages,
      },
    })
  } catch (error) {
    // Handle AI error gracefully
    console.error('[generateAIDraft] AI Error:', error.message)

    ticket.aiProcessingStatus = 'failed'
    ticket.aiErrorCode = error.code || 'UNKNOWN_ERROR'

    await ticket.save()

    // Still return the ticket so admin can write manual response
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
      warning: {
        message: 'AI draft generation failed. Please write a manual response.',
        errorCode: ticket.aiErrorCode,
      },
    })
  }
})

// POST /api/v1/admin/tickets/search
const searchTickets = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query

  if (!search || search.trim().length === 0) {
    throw AppError('Search term is required.', {
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
    throw AppError('Please provide at least one ticket ID.', {
      statusCode: 400,
      code: 'INVALID_TICKET_IDS',
    })
  }

  if (!updates || Object.keys(updates).length === 0) {
    throw AppError('Please provide at least one field to update.', {
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

// POST /api/v1/admin/tickets/:id/ai-classify
const classifyTicketWithAI = asyncHandler(async (req, res) => {
  const { id } = req.params
  const aiService = require('../services/ai.service').getInstance()

  const ticket = await Ticket.findById(id)

  if (!ticket) {
    throw AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  // Don't override if already classified by admin
  if (ticket.categorySource === 'admin' && ticket.prioritySource === 'admin') {
    throw AppError('Ticket is already manually classified.', {
      statusCode: 400,
      code: 'ALREADY_CLASSIFIED',
    })
  }

  ticket.aiProcessingStatus = 'pending'
  await ticket.save()

  try {
    // Classify
    const classification = await aiService.classifyTicket(ticket)

    // Only update if not already set by admin
    if (ticket.categorySource !== 'admin') {
      ticket.category = classification.category
      ticket.categorySource = 'ai'
    }

    if (ticket.prioritySource !== 'admin') {
      ticket.priority = classification.priority
      ticket.prioritySource = 'ai'
    }

    ticket.aiProcessingStatus = 'completed'
    ticket.aiErrorCode = null

    await ticket.save()

    res.status(200).json({
      success: true,
      data: {
        ticketNumber: ticket.ticketNumber,
        category: ticket.category,
        categorySource: ticket.categorySource,
        priority: ticket.priority,
        prioritySource: ticket.prioritySource,
        aiReason: classification.reason,
      },
    })
  } catch (error) {
    console.error('[classifyTicketWithAI] AI Error:', error.message)

    ticket.aiProcessingStatus = 'failed'
    ticket.aiErrorCode = error.code || 'UNKNOWN_ERROR'

    await ticket.save()

    throw AppError('AI classification failed. Please classify manually.', {
      statusCode: 500,
      code: 'AI_CLASSIFICATION_FAILED',
      details: {
        errorCode: ticket.aiErrorCode,
      },
    })
  }
})

module.exports = {
  getTickets,
  getTicketDetail,
  updateTicket,
  assignToSelf,
  addMessage,
  generateAIDraft,
  classifyTicketWithAI,
  searchTickets,
  getStatistics,
  getTicketsByAuthor,
  exportTicketsCSV,
  exportTicketsJSON,
  bulkUpdateTickets,
}


// POST /api/v1/admin/tickets/:id/messages/with-attachment
const addMessageWithAttachment = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { body, type } = req.body
  const adminId = req.user._id
  const FileService = require('../services/file.service')

  // Validate message body
  if (!body || body.trim().length === 0) {
    // Clean up uploaded files if body is empty
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }

    throw AppError('Message body is required.', {
      statusCode: 400,
      code: 'EMPTY_MESSAGE_BODY',
    })
  }

  // Validate message type
  if (!Object.values(MESSAGE_TYPES).includes(type)) {
    // Clean up files
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }

    throw AppError('Invalid message type.', {
      statusCode: 400,
      code: 'INVALID_MESSAGE_TYPE',
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

  try {
    // Extract file metadata
    const attachments = FileService.extractFileMetadata(req.files)

    // Create message
    const message = new TicketMessage({
      ticketId: ticket._id,
      senderId: adminId,
      senderRole: 'admin',
      type,
      body: body.trim(),
      attachments,
    })

    await message.save()

    // Update ticket status if admin sends first message
    if (ticket.status === 'Open') {
      ticket.status = 'In Progress'
      await ticket.save()
    }

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

      if (ticket.status === 'In Progress') {
        io.to(`ticket:${id}`).emit('ticket:updated', {
          ticketId: id.toString(),
          status: ticket.status,
          updatedAt: ticket.updatedAt,
        })
      }
    }

    // Return updated ticket
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
  } catch (error) {
    // Clean up files on error
    if (req.files && req.files.length > 0) {
      const filePaths = req.files.map((f) => `uploads/${f.filename}`)
      FileService.deleteFiles(filePaths)
    }
    throw error
  }
})

// GET /api/v1/admin/tickets/:ticketId/files/:messageId/:fileName
const downloadFile = asyncHandler(async (req, res) => {
  const { id: ticketId, messageId, fileName } = req.params
  const FileService = require('../services/file.service')

  // Verify ticket exists and user can access it
  const ticket = await Ticket.findById(ticketId)
  if (!ticket) {
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

  // Get file stream
  const fileStream = FileService.getFileStream(attachment.filePath)

  // Set headers for download
  res.setHeader('Content-Type', attachment.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.fileName}"`)

  // Pipe to response
  fileStream.pipe(res)

  // Handle errors
  fileStream.on('error', (error) => {
    console.error('[downloadFile] Stream error:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FILE_READ_ERROR',
          message: 'Error reading file',
        },
      })
    }
  })
})

// Export the new functions
module.exports.addMessageWithAttachment = addMessageWithAttachment
module.exports.downloadFile = downloadFile

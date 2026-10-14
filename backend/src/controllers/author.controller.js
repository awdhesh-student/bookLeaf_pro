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

  // Validate bookId if provided
  if (bookId) {
    const book = await Book.findOne({ bookId, authorId })
    if (!book) {
      throw new AppError('Book not found or does not belong to you.', {
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
      })
    }
  }

  // Validate category
  if (!TICKET_CATEGORIES.includes(category)) {
    throw new AppError('Invalid category.', {
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
    priority: 'Medium', // Will be overridden by AI on Day 3
    categorySource: 'admin',
    prioritySource: 'admin',
  })

  await ticket.save()

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
    throw new AppError('Ticket not found.', {
      statusCode: 404,
      code: 'TICKET_NOT_FOUND',
    })
  }

  if (ticket.authorId !== authorId) {
    throw new AppError('You do not have access to this ticket.', {
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
    throw new AppError('Search term is required.', {
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

module.exports = {
  getDashboard,
  getBooks,
  getTickets,
  createTicket,
  getTicketDetail,
  searchTickets,
  getBookStats,
  exportBooksCSV,
  exportBooksJSON,
  exportTicketsCSV,
  exportTicketsJSON,
}

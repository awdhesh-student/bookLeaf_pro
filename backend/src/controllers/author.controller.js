const asyncHandler = require('../utils/asyncHandler')
const AppError = require('../utils/AppError')
const AuthorProfile = require('../models/AuthorProfile')
const Book = require('../models/Book')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const { TICKET_CATEGORIES } = require('../constants')

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

  const books = await Book.find({ authorId }).sort({ createdAt: -1 })

  res.status(200).json({
    success: true,
    data: books,
  })
})

// GET /api/v1/author/tickets
const getTickets = asyncHandler(async (req, res) => {
  const authorId = req.user.authorId
  const { status, category, page = 1, limit = 10 } = req.query

  const query = { authorId }

  if (status) {
    query.status = status
  }

  if (category) {
    query.category = category
  }

  const skip = (parseInt(page) - 1) * parseInt(limit)

  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .lean()

  // Populate book titles
  for (const ticket of tickets) {
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

module.exports = {
  getDashboard,
  getBooks,
  getTickets,
  createTicket,
  getTicketDetail,
}

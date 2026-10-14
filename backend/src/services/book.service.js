const Book = require('../models/Book')
const AppError = require('../utils/AppError')

/**
 * Search books with filters
 */
const searchBooks = async (authorId, searchTerm, filters = {}, page = 1, limit = 10) => {
  const query = { authorId }

  // Full-text search
  if (searchTerm) {
    query.$or = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { genre: { $regex: searchTerm, $options: 'i' } },
      { isbn: { $regex: searchTerm, $options: 'i' } },
    ]
  }

  // Filter by status
  if (filters.status) {
    query.status = filters.status
  }

  // Filter by genre
  if (filters.genre) {
    query.genre = filters.genre
  }

  // Filter by date range
  if (filters.publishedAfter || filters.publishedBefore) {
    query.publicationDate = {}
    if (filters.publishedAfter) {
      query.publicationDate.$gte = new Date(filters.publishedAfter)
    }
    if (filters.publishedBefore) {
      query.publicationDate.$lte = new Date(filters.publishedBefore)
    }
  }

  const skip = (page - 1) * limit

  const books = await Book.find(query)
    .sort({ publicationDate: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  const total = await Book.countDocuments(query)

  return {
    books,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: skip + limit < total,
    },
  }
}

/**
 * Get book by ID
 */
const getBookById = async (bookId) => {
  const book = await Book.findOne({ bookId }).lean()

  if (!book) {
    throw new AppError('Book not found.', {
      statusCode: 404,
      code: 'BOOK_NOT_FOUND',
    })
  }

  return book
}

/**
 * Get book statistics
 */
const getBookStatistics = async (authorId) => {
  const books = await Book.find({ authorId }).lean()

  const stats = {
    totalBooks: books.length,
    publishedBooks: books.filter(b => b.status === 'Published & Live').length,
    inProductionBooks: books.filter(b => b.status !== 'Published & Live').length,
    totalCopiesSold: books.reduce((sum, b) => sum + (b.totalCopiesSold || 0), 0),
    totalRoyaltyEarned: books.reduce((sum, b) => sum + (b.totalRoyaltyEarned || 0), 0),
    totalRoyaltyPaid: books.reduce((sum, b) => sum + (b.royaltyPaid || 0), 0),
    totalRoyaltyPending: books.reduce((sum, b) => sum + (b.royaltyPending || 0), 0),
    averageRoyaltyPerBook: books.length > 0 
      ? Math.floor(books.reduce((sum, b) => sum + (b.totalRoyaltyEarned || 0), 0) / books.length)
      : 0,
    topSellingBooks: books
      .sort((a, b) => b.totalCopiesSold - a.totalCopiesSold)
      .slice(0, 5)
      .map(b => ({
        title: b.title,
        copies: b.totalCopiesSold,
        royalty: b.totalRoyaltyEarned,
      })),
  }

  return stats
}

/**
 * Export books to CSV
 */
const exportBooksToCSV = async (authorId, filters = {}) => {
  const query = { authorId }

  if (filters.status) {
    query.status = filters.status
  }

  const books = await Book.find(query).lean()

  const headers = [
    'Book ID',
    'Title',
    'ISBN',
    'Genre',
    'Publication Date',
    'Status',
    'MRP',
    'Copies Sold',
    'Royalty Per Copy',
    'Total Royalty Earned',
    'Royalty Paid',
    'Royalty Pending',
    'Print Partner',
    'Available On',
  ]

  const rows = books.map(book => [
    book.bookId,
    `"${book.title.replace(/"/g, '""')}"`,
    book.isbn || 'N/A',
    book.genre || 'N/A',
    book.publicationDate ? new Date(book.publicationDate).toISOString().split('T')[0] : 'N/A',
    book.status,
    book.mrp || '0',
    book.totalCopiesSold || '0',
    book.authorRoyaltyPerCopy || '0',
    book.totalRoyaltyEarned || '0',
    book.royaltyPaid || '0',
    book.royaltyPending || '0',
    book.printPartner || 'N/A',
    `"${(book.availableOn || []).join(', ')}"`,
  ])

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  return csv
}

/**
 * Export books to JSON
 */
const exportBooksToJSON = async (authorId, filters = {}) => {
  const query = { authorId }

  if (filters.status) {
    query.status = filters.status
  }

  const books = await Book.find(query).lean()

  return {
    exportedAt: new Date().toISOString(),
    totalBooks: books.length,
    books,
  }
}

module.exports = {
  searchBooks,
  getBookById,
  getBookStatistics,
  exportBooksToCSV,
  exportBooksToJSON,
}

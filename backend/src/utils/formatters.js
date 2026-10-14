/**
 * Utility functions for formatting responses
 */

/**
 * Format pagination response
 */
const formatPagination = (total, page, limit) => {
  return {
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    hasMore: page * limit < total,
  }
}

/**
 * Format currency (INR)
 */
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount || 0)
}

/**
 * Format date to ISO string (date only)
 */
const formatDateOnly = (date) => {
  if (!date) return null
  return new Date(date).toISOString().split('T')[0]
}

/**
 * Format date to readable format
 */
const formatDate = (date, locale = 'en-IN') => {
  if (!date) return null
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Format book for display
 */
const formatBook = (book) => {
  return {
    ...book.toObject ? book.toObject() : book,
    mrp: book.mrp ? `₹${book.mrp.toFixed(2)}` : null,
    totalRoyaltyEarned: `₹${(book.totalRoyaltyEarned || 0).toFixed(2)}`,
    royaltyPaid: `₹${(book.royaltyPaid || 0).toFixed(2)}`,
    royaltyPending: `₹${(book.royaltyPending || 0).toFixed(2)}`,
  }
}

/**
 * Format ticket for display
 */
const formatTicket = (ticket) => {
  return {
    ...ticket.toObject ? ticket.toObject() : ticket,
    createdAt: formatDate(ticket.createdAt),
    updatedAt: formatDate(ticket.updatedAt),
    resolvedAt: ticket.resolvedAt ? formatDate(ticket.resolvedAt) : null,
  }
}

/**
 * Format error response
 */
const formatError = (error) => {
  return {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.details || null,
    },
  }
}

module.exports = {
  formatPagination,
  formatCurrency,
  formatDateOnly,
  formatDate,
  formatBook,
  formatTicket,
  formatError,
}

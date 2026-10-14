const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const Book = require('../models/Book')
const AuthorProfile = require('../models/AuthorProfile')
const AppError = require('../utils/AppError')

/**
 * Build query object with advanced filtering
 */
const buildTicketQuery = (filters = {}) => {
  const query = {}

  if (filters.status) {
    query.status = filters.status
  }

  if (filters.priority) {
    query.priority = filters.priority
  }

  if (filters.category) {
    query.category = filters.category
  }

  if (filters.assignedAdminId) {
    query.assignedAdminId = filters.assignedAdminId
  }

  // Search in subject or description
  if (filters.search) {
    query.$or = [
      { subject: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ]
  }

  // Date range filtering
  if (filters.createdAfter || filters.createdBefore) {
    query.createdAt = {}
    if (filters.createdAfter) {
      query.createdAt.$gte = new Date(filters.createdAfter)
    }
    if (filters.createdBefore) {
      query.createdAt.$lte = new Date(filters.createdBefore)
    }
  }

  // Filter by author
  if (filters.authorId) {
    query.authorId = filters.authorId
  }

  // Filter by book
  if (filters.bookId) {
    query.bookId = filters.bookId
  }

  // Filter resolved/unresolved
  if (filters.resolved === 'true') {
    query.status = { $in: ['Resolved', 'Closed'] }
  } else if (filters.resolved === 'false') {
    query.status = { $in: ['Open', 'In Progress'] }
  }

  return query
}

/**
 * Get paginated tickets with population and filtering
 */
const getPaginatedTickets = async (filters = {}, page = 1, limit = 10) => {
  const query = buildTicketQuery(filters)
  const skip = (page - 1) * limit

  // Validate sort field
  const SORT_WHITELIST = ['createdAt', 'priority', 'status', 'updatedAt']
  const sortField = SORT_WHITELIST.includes(filters.sort) ? filters.sort : 'createdAt'
  const sortOrder = filters.order === 'asc' ? 1 : -1

  const tickets = await Ticket.find(query)
    .sort({ [sortField]: sortOrder })
    .skip(skip)
    .limit(limit)
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

  return {
    tickets,
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
 * Search tickets with full-text capabilities
 */
const searchTickets = async (searchTerm, filters = {}, page = 1, limit = 10) => {
  const query = buildTicketQuery({ ...filters, search: searchTerm })
  const skip = (page - 1) * limit

  const tickets = await Ticket.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()

  // Populate details
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

  return {
    tickets,
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
 * Bulk update tickets
 */
const bulkUpdateTickets = async (ticketIds, updates) => {
  const allowedUpdates = ['status', 'priority', 'category', 'assignedAdminId']
  
  // Validate that only allowed fields are updated
  const updateKeys = Object.keys(updates)
  const invalidKeys = updateKeys.filter(key => !allowedUpdates.includes(key))
  
  if (invalidKeys.length > 0) {
    throw new AppError(`Invalid fields for bulk update: ${invalidKeys.join(', ')}`, {
      statusCode: 400,
      code: 'INVALID_UPDATE_FIELDS',
    })
  }

  // Perform bulk update
  const result = await Ticket.updateMany(
    { _id: { $in: ticketIds } },
    { $set: updates },
    { new: true }
  )

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  }
}

/**
 * Export tickets to CSV format
 */
const exportTicketsToCSV = async (filters = {}) => {
  const query = buildTicketQuery(filters)
  const tickets = await Ticket.find(query).lean()

  // Populate details
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

  // Define CSV headers
  const headers = [
    'Ticket Number',
    'Subject',
    'Author Email',
    'Book Title',
    'Category',
    'Priority',
    'Status',
    'Created Date',
    'Updated Date',
    'Description',
  ]

  // Create CSV rows
  const rows = tickets.map(ticket => [
    ticket.ticketNumber,
    `"${ticket.subject.replace(/"/g, '""')}"`, // Escape quotes
    ticket.authorEmail,
    ticket.bookTitle || 'General / Account',
    ticket.category,
    ticket.priority,
    ticket.status,
    new Date(ticket.createdAt).toISOString().split('T')[0],
    new Date(ticket.updatedAt).toISOString().split('T')[0],
    `"${ticket.description.replace(/"/g, '""')}"`, // Escape quotes
  ])

  // Build CSV string
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  return csv
}

/**
 * Export tickets to JSON format
 */
const exportTicketsToJSON = async (filters = {}) => {
  const query = buildTicketQuery(filters)
  const tickets = await Ticket.find(query).lean()

  // Populate details
  for (const ticket of tickets) {
    const authorProfile = await AuthorProfile.findOne({ authorId: ticket.authorId }).lean()
    ticket.authorEmail = authorProfile?.email || 'Unknown'

    if (ticket.bookId) {
      const book = await Book.findOne({ bookId: ticket.bookId }).lean()
      ticket.bookTitle = book?.title || null
    } else {
      ticket.bookTitle = null
    }

    // Include message count
    const messageCount = await TicketMessage.countDocuments({ ticketId: ticket._id })
    ticket.messageCount = messageCount
  }

  return {
    exportedAt: new Date().toISOString(),
    totalTickets: tickets.length,
    tickets,
  }
}

/**
 * Get ticket statistics
 */
const getTicketStatistics = async (filters = {}) => {
  const query = buildTicketQuery(filters)

  const stats = await Ticket.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalTickets: { $sum: 1 },
        byStatus: {
          $push: {
            status: '$status',
          },
        },
        byPriority: {
          $push: {
            priority: '$priority',
          },
        },
        byCategory: {
          $push: {
            category: '$category',
          },
        },
      },
    },
  ])

  if (stats.length === 0) {
    return {
      totalTickets: 0,
      statusCounts: {},
      priorityCounts: {},
      categoryCounts: {},
      averageResolutionTime: null,
    }
  }

  const data = stats[0]

  // Count by status
  const statusCounts = {}
  data.byStatus.forEach(item => {
    statusCounts[item.status] = (statusCounts[item.status] || 0) + 1
  })

  // Count by priority
  const priorityCounts = {}
  data.byPriority.forEach(item => {
    priorityCounts[item.priority] = (priorityCounts[item.priority] || 0) + 1
  })

  // Count by category
  const categoryCounts = {}
  data.byCategory.forEach(item => {
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
  })

  // Calculate average resolution time for resolved tickets
  const resolvedTickets = await Ticket.find({
    ...query,
    status: { $in: ['Resolved', 'Closed'] },
    resolvedAt: { $exists: true, $ne: null },
  }).lean()

  let averageResolutionTime = null
  if (resolvedTickets.length > 0) {
    const totalTime = resolvedTickets.reduce((sum, ticket) => {
      const created = new Date(ticket.createdAt)
      const resolved = new Date(ticket.resolvedAt)
      return sum + (resolved - created)
    }, 0)
    averageResolutionTime = Math.floor(totalTime / resolvedTickets.length / (1000 * 60 * 60 * 24)) // in days
  }

  return {
    totalTickets: data.totalTickets,
    statusCounts,
    priorityCounts,
    categoryCounts,
    averageResolutionTime,
  }
}

/**
 * Get tickets by author for analytics
 */
const getTicketsByAuthor = async (page = 1, limit = 10) => {
  const skip = (page - 1) * limit

  const authorStats = await Ticket.aggregate([
    {
      $group: {
        _id: '$authorId',
        ticketCount: { $sum: 1 },
        openCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Open'] }, 1, 0],
          },
        },
        resolvedCount: {
          $sum: {
            $cond: [{ $in: ['$status', ['Resolved', 'Closed']] }, 1, 0],
          },
        },
      },
    },
    { $sort: { ticketCount: -1 } },
    { $skip: skip },
    { $limit: limit },
  ])

  // Populate author profiles
  for (const stat of authorStats) {
    const authorProfile = await AuthorProfile.findOne({ authorId: stat._id }).lean()
    stat.authorName = authorProfile?.name || 'Unknown'
    stat.authorEmail = authorProfile?.email || 'Unknown'
  }

  const total = await Ticket.aggregate([
    {
      $group: {
        _id: '$authorId',
      },
    },
    {
      $count: 'count',
    },
  ])

  return {
    authorStats,
    pagination: {
      total: total[0]?.count || 0,
      page,
      limit,
      pages: Math.ceil((total[0]?.count || 0) / limit),
    },
  }
}

module.exports = {
  buildTicketQuery,
  getPaginatedTickets,
  searchTickets,
  bulkUpdateTickets,
  exportTicketsToCSV,
  exportTicketsToJSON,
  getTicketStatistics,
  getTicketsByAuthor,
}

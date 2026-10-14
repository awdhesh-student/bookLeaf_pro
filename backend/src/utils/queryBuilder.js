/**
 * Utility functions for building MongoDB queries
 */

/**
 * Build a pagination object
 */
const buildPagination = (page = 1, limit = 10) => {
  const pageNum = Math.max(1, parseInt(page) || 1)
  const limitNum = Math.max(1, Math.min(100, parseInt(limit) || 10))
  
  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum,
  }
}

/**
 * Build a sort object from sort and order params
 */
const buildSort = (sort, order, whitelist = []) => {
  const validSort = whitelist.includes(sort) ? sort : 'createdAt'
  const validOrder = order === 'asc' ? 1 : -1
  
  return {
    [validSort]: validOrder,
  }
}

/**
 * Build date range filter
 */
const buildDateRange = (startDate, endDate) => {
  const dateFilter = {}
  
  if (startDate) {
    dateFilter.$gte = new Date(startDate)
  }
  
  if (endDate) {
    dateFilter.$lte = new Date(endDate)
  }
  
  return Object.keys(dateFilter).length > 0 ? dateFilter : null
}

/**
 * Build text search query
 */
const buildTextSearch = (searchTerm, fields) => {
  if (!searchTerm) return null
  
  return {
    $or: fields.map(field => ({
      [field]: { $regex: searchTerm, $options: 'i' }
    }))
  }
}

module.exports = {
  buildPagination,
  buildSort,
  buildDateRange,
  buildTextSearch,
}

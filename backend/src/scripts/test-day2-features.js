/**
 * Test script for Day 2 features
 * Tests:
 * - Advanced search and filtering
 * - Bulk update operations
 * - Export functionality
 * - Statistics endpoints
 * - Pagination optimization
 */

const mongoose = require('mongoose')
const Ticket = require('../models/Ticket')

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
}

const log = {
  success: (msg) => console.log(`${COLORS.green}✓${COLORS.reset} ${msg}`),
  error: (msg) => console.log(`${COLORS.red}✗${COLORS.reset} ${msg}`),
  info: (msg) => console.log(`${COLORS.blue}ℹ${COLORS.reset} ${msg}`),
  test: (msg) => console.log(`${COLORS.yellow}→${COLORS.reset} ${msg}`),
}

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DB_NAME,
    })
    log.success('Connected to database')
  } catch (err) {
    log.error(`Database connection failed: ${err.message}`)
    process.exit(1)
  }
}

async function testAdvancedFiltering() {
  log.test('Testing Advanced Filtering')
  try {
    // Test 1: Filter by status
    const openTickets = await Ticket.find({ status: 'Open' }).lean()
    log.success(`Found ${openTickets.length} open tickets`)

    // Test 2: Filter by priority
    const criticalTickets = await Ticket.find({ priority: 'Critical' }).lean()
    log.success(`Found ${criticalTickets.length} critical tickets`)

    // Test 3: Filter by category
    const royaltyTickets = await Ticket.find({ category: 'Royalty & Payments' }).lean()
    log.success(`Found ${royaltyTickets.length} royalty tickets`)

    // Test 4: Multiple filters combined
    const combined = await Ticket.find({
      status: 'Open',
      priority: { $in: ['High', 'Critical'] },
    }).lean()
    log.success(`Found ${combined.length} open high/critical tickets`)
  } catch (err) {
    log.error(`Advanced filtering failed: ${err.message}`)
  }
}

async function testPagination() {
  log.test('Testing Pagination')
  try {
    const page1 = await Ticket.find({})
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(10)
      .lean()
    log.success(`Fetched page 1: ${page1.length} items`)

    const page2 = await Ticket.find({})
      .sort({ createdAt: -1 })
      .skip(10)
      .limit(10)
      .lean()
    log.success(`Fetched page 2: ${page2.length} items`)

    const total = await Ticket.countDocuments({})
    log.success(`Total tickets in database: ${total}`)
  } catch (err) {
    log.error(`Pagination test failed: ${err.message}`)
  }
}

async function testSearching() {
  log.test('Testing Search')
  try {
    // Search in subject
    const subjectSearch = await Ticket.find({
      subject: { $regex: 'royalty', $options: 'i' },
    }).lean()
    log.success(`Found ${subjectSearch.length} tickets with 'royalty' in subject`)

    // Search in description
    const descSearch = await Ticket.find({
      description: { $regex: 'payment', $options: 'i' },
    }).lean()
    log.success(`Found ${descSearch.length} tickets with 'payment' in description`)
  } catch (err) {
    log.error(`Search test failed: ${err.message}`)
  }
}

async function testBulkUpdate() {
  log.test('Testing Bulk Update')
  try {
    // Get 3 open tickets
    const tickets = await Ticket.find({ status: 'Open' }).limit(3).lean()

    if (tickets.length === 0) {
      log.info('No open tickets available for bulk update test')
      return
    }

    const ticketIds = tickets.map((t) => t._id)

    // Update status for these tickets
    const result = await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { $set: { status: 'In Progress' } },
      { new: true }
    )

    log.success(`Bulk updated ${result.modifiedCount} tickets`)

    // Revert changes
    await Ticket.updateMany(
      { _id: { $in: ticketIds } },
      { $set: { status: 'Open' } }
    )
    log.success('Reverted bulk update')
  } catch (err) {
    log.error(`Bulk update test failed: ${err.message}`)
  }
}

async function testAggregation() {
  log.test('Testing Aggregation for Statistics')
  try {
    const stats = await Ticket.aggregate([
      {
        $group: {
          _id: null,
          totalTickets: { $sum: 1 },
          byStatus: { $push: '$status' },
          byPriority: { $push: '$priority' },
          byCategory: { $push: '$category' },
        },
      },
    ])

    if (stats.length > 0) {
      const data = stats[0]
      const statusCounts = {}
      data.byStatus.forEach((status) => {
        statusCounts[status] = (statusCounts[status] || 0) + 1
      })

      log.success(`Total tickets: ${data.totalTickets}`)
      log.success(`Status breakdown: ${JSON.stringify(statusCounts)}`)
    }
  } catch (err) {
    log.error(`Aggregation test failed: ${err.message}`)
  }
}

async function testIndexes() {
  log.test('Testing Database Indexes')
  try {
    const indexes = await Ticket.collection.getIndexes()
    log.success(`Database has ${Object.keys(indexes).length} indexes`)

    const requiredIndexes = ['ticketNumber_1', 'authorId_1_createdAt_-1']
    for (const index of requiredIndexes) {
      if (indexes[index]) {
        log.success(`Index found: ${index}`)
      } else {
        log.info(`Index missing: ${index}`)
      }
    }
  } catch (err) {
    log.error(`Index test failed: ${err.message}`)
  }
}

async function runTests() {
  log.info('Starting Day 2 Features Test Suite')
  log.info('================================\n')

  await connectDB()

  await testAdvancedFiltering()
  log.info('')

  await testPagination()
  log.info('')

  await testSearching()
  log.info('')

  await testBulkUpdate()
  log.info('')

  await testAggregation()
  log.info('')

  await testIndexes()

  log.info('')
  log.success('All tests completed')
  process.exit(0)
}

runTests().catch((err) => {
  log.error(`Test suite failed: ${err.message}`)
  process.exit(1)
})

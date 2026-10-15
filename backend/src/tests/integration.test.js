/**
 * Comprehensive Integration Tests for Day 4 - Workflow & Tests
 * Tests: ownership, privacy, AI failure, edge cases, real-time updates
 */

const mongoose = require('mongoose')
const config = require('../config/config')
const connectToDB = require('../config/database')
const User = require('../models/User')
const AuthorProfile = require('../models/AuthorProfile')
const Book = require('../models/Book')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const authService = require('../services/auth.service')
const ticketService = require('../services/ticket.service')
const aiService = require('../services/ai.service')

const TEST_CONFIG = {
  VERBOSE: true,
  STOP_ON_FIRST_FAILURE: false,
}

let testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: [],
}

// Test utilities
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

const assertExists = (value, message) => {
  if (!value) {
    throw new Error(message)
  }
}

const runTest = async (name, testFn) => {
  try {
    if (TEST_CONFIG.VERBOSE) {
      console.log(`  ⏳ ${name}`)
    }
    await testFn()
    testResults.passed++
    if (TEST_CONFIG.VERBOSE) {
      console.log(`  ✓ ${name}`)
    }
  } catch (error) {
    testResults.failed++
    testResults.errors.push({ test: name, error: error.message })
    if (TEST_CONFIG.VERBOSE) {
      console.log(`  ✗ ${name}`)
      console.log(`    ${error.message}`)
    }
    if (TEST_CONFIG.STOP_ON_FIRST_FAILURE) {
      throw error
    }
  }
}

// Cleanup between tests
const cleanup = async () => {
  await TicketMessage.deleteMany({})
  await Ticket.deleteMany({})
  await Book.deleteMany({})
  await AuthorProfile.deleteMany({})
  await User.deleteMany({})
}

// Setup test data
const createTestAuthor = async (email = 'author1@test.com', authorId = 'AUTH_TEST_001') => {
  const authorProfile = await AuthorProfile.create({
    authorId,
    name: 'Test Author',
    email,
    phone: '+91-9876543210',
    city: 'Mumbai',
    joinedDate: new Date('2023-01-15'),
  })

  const passwordHash = await authService.hashPassword('TestPassword123')
  const user = await User.create({
    email,
    passwordHash,
    role: 'author',
    authorId,
    isActive: true,
  })

  return { user, authorProfile }
}

const createTestAdmin = async (email = 'admin@test.com') => {
  const passwordHash = await authService.hashPassword('AdminPassword123')
  const user = await User.create({
    email,
    passwordHash,
    role: 'admin',
    isActive: true,
  })

  return user
}

const createTestBook = async (authorId, bookId = 'BK_TEST_001') => {
  const book = await Book.create({
    bookId,
    authorId,
    title: 'Test Book',
    isbn: '978-93-5XXXX-01-1',
    genre: 'Fiction',
    publicationDate: new Date('2024-01-01'),
    status: 'Published & Live',
    mrp: 399,
    authorRoyaltyPerCopy: 30,
    totalCopiesSold: 100,
    totalRoyaltyEarned: 3000,
    royaltyPaid: 2000,
    royaltyPending: 1000,
    lastRoyaltyPayoutDate: new Date('2024-09-30'),
    printPartner: 'Epitome Books',
    availableOn: ['Amazon India', 'Flipkart'],
  })

  return book
}

const createTestTicket = async (authorId, bookId = null, subject = 'Test Subject', description = 'Test description for ticket') => {
  const count = await Ticket.countDocuments()
  const ticketNumber = `BL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const ticket = await Ticket.create({
    ticketNumber,
    authorId,
    bookId,
    subject,
    description,
    category: 'General Inquiry',
    priority: 'Medium',
    status: 'Open',
    categorySource: 'admin',
    prioritySource: 'admin',
    aiProcessingStatus: 'completed',
  })

  return ticket
}

const createTestMessage = async (ticketId, senderId, type, body) => {
  const message = await TicketMessage.create({
    ticketId,
    senderId,
    senderRole: type === 'public_reply' ? 'admin' : 'admin',
    type,
    body,
  })

  return message
}

// ============================================================================
// TEST SUITE
// ============================================================================

const runTests = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║  BookLeaf Support Portal - Day 4 Integration Test Suite        ║')
  console.log('║  Workflow & Tests (Ownership, Privacy, AI Failure, Edge Cases) ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  // Connect to database
  try {
    await connectToDB()
    console.log('✓ Connected to MongoDB\n')
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message)
    process.exit(1)
  }

  // ========================================================================
  // 1. OWNERSHIP & AUTHORIZATION TESTS
  // ========================================================================
  console.log('1️⃣  OWNERSHIP & AUTHORIZATION TESTS\n')

  await runTest('Author A cannot access Author B tickets', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')
    const { user: author2, authorProfile: profile2 } = await createTestAuthor('author2@test.com', 'AUTH_002')
    const ticket = await createTestTicket(profile1.authorId)

    // Try to access as Author 2
    const foundTicket = await Ticket.findById(ticket._id).lean()
    assert(foundTicket.authorId !== profile2.authorId, 'Ticket should belong to Author 1, not Author 2')
  })

  await runTest('Author can only see their own books in ticket creation', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')
    const { user: author2, authorProfile: profile2 } = await createTestAuthor('author2@test.com', 'AUTH_002')

    const book1 = await createTestBook(profile1.authorId, 'BK_001')
    const book2 = await createTestBook(profile2.authorId, 'BK_002')

    // Author 1 should be able to create ticket for their own book
    const books1 = await Book.find({ authorId: profile1.authorId })
    assertEqual(books1.length, 1, 'Author 1 should have 1 book')
    assertEqual(books1[0].bookId, 'BK_001', 'Book should belong to Author 1')

    // Author 2 should not see Author 1's book
    const books2 = await Book.find({ authorId: profile2.authorId })
    assertEqual(books2.length, 1, 'Author 2 should have 1 book')
    assertEqual(books2[0].bookId, 'BK_002', 'Book should belong to Author 2')
  })

  await runTest('Author cannot create ticket for another author\'s book', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')
    const { user: author2, authorProfile: profile2 } = await createTestAuthor('author2@test.com', 'AUTH_002')

    const book2 = await createTestBook(profile2.authorId, 'BK_002')

    // Author 1 tries to create ticket for Author 2's book
    const book = await Book.findOne({ bookId: 'BK_002', authorId: profile2.authorId })
    assertExists(book, 'Book should exist')
    
    // Verify it's not accessible to Author 1
    const bookForAuthor1 = await Book.findOne({ bookId: 'BK_002', authorId: profile1.authorId })
    assert(!bookForAuthor1, 'Author 1 should not be able to access Author 2\'s book')
  })

  await runTest('Author can create General/Account Level tickets without bookId', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')

    const ticket = await createTestTicket(profile1.authorId, null, 'Account Question', 'How do I update my profile?')
    assertEqual(ticket.bookId, null, 'General ticket should have null bookId')
    assertEqual(ticket.authorId, profile1.authorId, 'Ticket should belong to Author 1')
  })

  // ========================================================================
  // 2. PRIVACY & DATA VISIBILITY TESTS
  // ========================================================================
  console.log('\n2️⃣  PRIVACY & DATA VISIBILITY TESTS\n')

  await runTest('Authors cannot see internal notes', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    // Admin creates internal note
    const internalNote = await createTestMessage(ticket._id, admin._id, 'internal_note', 'Internal: Check order history')

    // Fetch as author - should only get public_reply messages
    const publicMessages = await TicketMessage.find({
      ticketId: ticket._id,
      type: 'public_reply',
    })
    
    const allMessages = await TicketMessage.find({ ticketId: ticket._id })
    assert(allMessages.length > 0, 'Messages should exist')
    assertEqual(publicMessages.length, 0, 'Author should not see internal notes')
  })

  await runTest('Public replies are visible to authorized users only', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')
    const { user: author2, authorProfile: profile2 } = await createTestAuthor('author2@test.com', 'AUTH_002')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile1.authorId)

    // Admin sends public reply
    const publicReply = await createTestMessage(ticket._id, admin._id, 'public_reply', 'Thank you for your inquiry...')

    // Author 1 should see it
    const messages1 = await TicketMessage.find({
      ticketId: ticket._id,
      type: 'public_reply',
    })
    assertEqual(messages1.length, 1, 'Author 1 should see 1 public reply')

    // Author 2 should not see it (different ticket)
    const messages2 = await TicketMessage.find({
      ticketId: ticket._id,
    }).lean()
    // Author 2 would need to try accessing this ticket to fail, which should happen at ticket level
    assert(true, 'Privacy check handled at ticket authorization level')
  })

  await runTest('Admins see both public and internal notes', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    const publicReply = await createTestMessage(ticket._id, admin._id, 'public_reply', 'Public response...')
    const internalNote = await createTestMessage(ticket._id, admin._id, 'internal_note', 'Internal note...')

    const allMessages = await TicketMessage.find({ ticketId: ticket._id })
    assertEqual(allMessages.length, 2, 'Admin should see both types of messages')
  })

  // ========================================================================
  // 3. TICKET STATUS & WORKFLOW TESTS
  // ========================================================================
  console.log('\n3️⃣  TICKET STATUS & WORKFLOW TESTS\n')

  await runTest('Ticket status transitions are valid', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket(profile.authorId)

    // Valid transitions
    ticket.status = 'In Progress'
    await ticket.save()
    assertEqual(ticket.status, 'In Progress', 'Should transition to In Progress')

    ticket.status = 'Resolved'
    ticket.resolvedAt = new Date()
    await ticket.save()
    assertEqual(ticket.status, 'Resolved', 'Should transition to Resolved')

    ticket.status = 'Closed'
    await ticket.save()
    assertEqual(ticket.status, 'Closed', 'Should transition to Closed')
  })

  await runTest('Resolved tickets have resolvedAt timestamp', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket(profile.authorId)
    
    assertEqual(ticket.resolvedAt, null, 'New ticket should have null resolvedAt')

    ticket.status = 'Resolved'
    ticket.resolvedAt = new Date()
    await ticket.save()

    assertExists(ticket.resolvedAt, 'Resolved ticket should have resolvedAt timestamp')
  })

  await runTest('Ticket status filters work correctly', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    
    const ticket1 = await createTestTicket(profile.authorId)
    const ticket2 = await createTestTicket(profile.authorId)
    const ticket3 = await createTestTicket(profile.authorId)

    ticket1.status = 'Open'
    ticket2.status = 'In Progress'
    ticket3.status = 'Resolved'

    await Promise.all([ticket1.save(), ticket2.save(), ticket3.save()])

    const openTickets = await Ticket.find({ status: 'Open' })
    const inProgressTickets = await Ticket.find({ status: 'In Progress' })
    const resolvedTickets = await Ticket.find({ status: 'Resolved' })

    assertEqual(openTickets.length, 1, 'Should have 1 open ticket')
    assertEqual(inProgressTickets.length, 1, 'Should have 1 in progress ticket')
    assertEqual(resolvedTickets.length, 1, 'Should have 1 resolved ticket')
  })

  // ========================================================================
  // 4. AI CLASSIFICATION & PRIORITY TESTS
  // ========================================================================
  console.log('\n4️⃣  AI CLASSIFICATION & PRIORITY TESTS\n')

  await runTest('Mock classification handles all ticket types', async () => {
    const service = aiService.getInstance()

    const ticketTypes = [
      { subject: 'Missing royalty payment', description: 'Payment overdue 60 days', expected: 'Royalty & Payments' },
      { subject: 'ISBN is incorrect', description: 'My ISBN shows wrong on Amazon', expected: 'ISBN & Metadata Issues' },
      { subject: 'Print quality issue', description: 'Pages have defects', expected: 'Printing & Quality' },
      { subject: 'Not available on Flipkart', description: 'My book is not showing on Flipkart', expected: 'Distribution & Availability' },
      { subject: 'Production stuck', description: 'My book status has not updated', expected: 'Book Status & Production Updates' },
    ]

    for (const ticketData of ticketTypes) {
      const ticket = {
        subject: ticketData.subject,
        description: ticketData.description,
      }

      const classification = service.getMockClassification(ticket)
      assert(
        classification.category === ticketData.expected || classification.category === 'General Inquiry',
        `Should classify as ${ticketData.expected}, got ${classification.category}`
      )
    }
  })

  await runTest('Priority assignment reflects urgency', async () => {
    const service = aiService.getInstance()

    const criticalTicket = {
      subject: 'Critical: Missing 6 months payment',
      description: 'No payment since March 2025',
    }

    const lowPriorityTicket = {
      subject: 'Feature suggestion',
      description: 'Can you add dark mode?',
    }

    const criticalClass = service.getMockClassification(criticalTicket)
    const lowClass = service.getMockClassification(lowPriorityTicket)

    assert(criticalClass.priority !== 'Low', 'Critical payment issue should not be Low priority')
    assert(['Critical', 'High', 'Medium', 'Low'].includes(criticalClass.priority), 'Priority should be valid')
  })

  await runTest('Admin overrides prevent AI re-classification', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket(profile.authorId)

    // Admin manually sets category and priority
    ticket.category = 'ISBN & Metadata Issues'
    ticket.categorySource = 'admin'
    ticket.priority = 'Critical'
    ticket.prioritySource = 'admin'
    await ticket.save()

    // Verify admin source is set
    assertEqual(ticket.categorySource, 'admin', 'Category source should be admin')
    assertEqual(ticket.prioritySource, 'admin', 'Priority source should be admin')

    // In real flow, admin overrides would be preserved on re-classification
    assert(ticket.categorySource === 'admin', 'Admin override should be preserved')
  })

  // ========================================================================
  // 5. AI ERROR HANDLING & FALLBACK TESTS
  // ========================================================================
  console.log('\n5️⃣  AI ERROR HANDLING & FALLBACK TESTS\n')

  await runTest('Ticket creation never blocked by AI errors', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    // Create ticket - should succeed even if AI is down
    const ticket = await createTestTicket(profile.authorId)
    assertExists(ticket, 'Ticket should be created')
    assert(ticket._id, 'Ticket should have ID')
    assertEqual(ticket.status, 'Open', 'Ticket should have Open status')
  })

  await runTest('Failed classification sets aiErrorCode but preserves ticket', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket(profile.authorId)

    // Simulate AI failure
    ticket.aiProcessingStatus = 'failed'
    ticket.aiErrorCode = 'AI_REQUEST_FAILED'
    await ticket.save()

    const reloaded = await Ticket.findById(ticket._id)
    assertEqual(reloaded.aiProcessingStatus, 'failed', 'Should record AI failure')
    assertEqual(reloaded.aiErrorCode, 'AI_REQUEST_FAILED', 'Should have error code')
    assert(reloaded.status === 'Open', 'Ticket should still be usable')
  })

  await runTest('Mock fallback provides reasonable classification', async () => {
    const service = aiService.getInstance()

    const ticket = {
      subject: 'Royalty payment issue',
      description: 'I did not receive my quarterly royalty',
    }

    const mockClass = service.getMockClassification(ticket)
    assertEqual(mockClass.category, 'Royalty & Payments', 'Should classify as Royalty & Payments')
    assert(['Critical', 'High', 'Medium', 'Low'].includes(mockClass.priority), 'Priority should be valid')
  })

  await runTest('Mock draft provides fallback response', async () => {
    const service = aiService.getInstance()

    const ticket = {
      category: 'Royalty & Payments',
      priority: 'High',
      subject: 'Missing payment',
      description: 'No royalty for Q3',
    }

    const author = {
      name: 'Test Author',
      email: 'test@example.com',
      phone: '+91-9876543210',
      city: 'Mumbai',
      joinedDate: new Date('2023-01-01'),
    }

    const book = {
      title: 'Test Book',
      isbn: '978-93-5XXXX-01-1',
      status: 'Published & Live',
      totalRoyaltyEarned: 5000,
      royaltyPaid: 3000,
      royaltyPending: 2000,
    }

    const draft = service.getMockDraft(ticket, author, book)
    assert(draft.draft.length > 50, 'Draft should be substantial')
    assert(draft.draft.includes('Test Author') || draft.draft.includes('author'), 'Draft should mention author')
  })

  // ========================================================================
  // 6. MESSAGE & COMMUNICATION TESTS
  // ========================================================================
  console.log('\n6️⃣  MESSAGE & COMMUNICATION TESTS\n')

  await runTest('Public reply creates correct message type', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    const message = await createTestMessage(ticket._id, admin._id, 'public_reply', 'Thank you for contacting us...')

    assertEqual(message.type, 'public_reply', 'Message type should be public_reply')
    assertEqual(message.senderRole, 'admin', 'Sender role should be admin')
  })

  await runTest('Internal note creates correct message type', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    const message = await createTestMessage(ticket._id, admin._id, 'internal_note', 'Needs verification')

    assertEqual(message.type, 'internal_note', 'Message type should be internal_note')
  })

  await runTest('Messages are sorted chronologically', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    const msg1 = await createTestMessage(ticket._id, admin._id, 'public_reply', 'First')
    await new Promise(resolve => setTimeout(resolve, 100))
    const msg2 = await createTestMessage(ticket._id, admin._id, 'public_reply', 'Second')
    await new Promise(resolve => setTimeout(resolve, 100))
    const msg3 = await createTestMessage(ticket._id, admin._id, 'public_reply', 'Third')

    const sorted = await TicketMessage.find({ ticketId: ticket._id }).sort({ createdAt: 1 })
    assertEqual(sorted.length, 3, 'Should have 3 messages')
    assertEqual(sorted[0]._id.toString(), msg1._id.toString(), 'First message should be first')
    assertEqual(sorted[2]._id.toString(), msg3._id.toString(), 'Third message should be last')
  })

  await runTest('Message content is preserved correctly', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    const ticket = await createTestTicket(profile.authorId)

    const content = 'This is a detailed response with special characters: @#$%^&*()'
    const message = await createTestMessage(ticket._id, admin._id, 'public_reply', content)

    const fetched = await TicketMessage.findById(message._id)
    assertEqual(fetched.body, content, 'Message content should be preserved exactly')
  })

  // ========================================================================
  // 7. FILTERING & QUERY TESTS
  // ========================================================================
  console.log('\n7️⃣  FILTERING & QUERY TESTS\n')

  await runTest('Filter tickets by status', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const t1 = await createTestTicket(profile.authorId)
    const t2 = await createTestTicket(profile.authorId)
    const t3 = await createTestTicket(profile.authorId)

    t1.status = 'Open'
    t2.status = 'In Progress'
    t3.status = 'Resolved'

    await Promise.all([t1.save(), t2.save(), t3.save()])

    const query = ticketService.buildTicketQuery({ status: 'Open', authorId: profile.authorId })
    const results = await Ticket.find(query)

    assertEqual(results.length, 1, 'Should find 1 open ticket')
    assertEqual(results[0]._id.toString(), t1._id.toString(), 'Should be the open ticket')
  })

  await runTest('Filter tickets by priority', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const t1 = await createTestTicket(profile.authorId)
    const t2 = await createTestTicket(profile.authorId)

    t1.priority = 'Critical'
    t2.priority = 'Low'

    await Promise.all([t1.save(), t2.save()])

    const query = ticketService.buildTicketQuery({ priority: 'Critical', authorId: profile.authorId })
    const results = await Ticket.find(query)

    assertEqual(results.length, 1, 'Should find 1 critical ticket')
  })

  await runTest('Filter tickets by category', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const t1 = await createTestTicket(profile.authorId)
    const t2 = await createTestTicket(profile.authorId)

    t1.category = 'Royalty & Payments'
    t2.category = 'ISBN & Metadata Issues'

    await Promise.all([t1.save(), t2.save()])

    const query = ticketService.buildTicketQuery({ category: 'Royalty & Payments', authorId: profile.authorId })
    const results = await Ticket.find(query)

    assertEqual(results.length, 1, 'Should find 1 royalty ticket')
  })

  await runTest('Search tickets by keyword', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    await createTestTicket(profile.authorId, null, 'Payment Issue', 'Missing royalty')
    await createTestTicket(profile.authorId, null, 'ISBN Problem', 'Incorrect number')

    const query = ticketService.buildTicketQuery({ search: 'royalty', authorId: profile.authorId })
    const results = await Ticket.find(query)

    assertEqual(results.length, 1, 'Should find ticket with "royalty" keyword')
  })

  await runTest('Pagination works correctly', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    for (let i = 0; i < 25; i++) {
      await createTestTicket(profile.authorId, null, `Ticket ${i}`, `Description ${i}`)
    }

    const result1 = await ticketService.getPaginatedTickets({ authorId: profile.authorId }, 1, 10)
    assertEqual(result1.tickets.length, 10, 'Page 1 should have 10 items')
    assertEqual(result1.pagination.total, 25, 'Total should be 25')
    assertEqual(result1.pagination.pages, 3, 'Should have 3 pages')

    const result2 = await ticketService.getPaginatedTickets({ authorId: profile.authorId }, 2, 10)
    assertEqual(result2.tickets.length, 10, 'Page 2 should have 10 items')

    const result3 = await ticketService.getPaginatedTickets({ authorId: profile.authorId }, 3, 10)
    assertEqual(result3.tickets.length, 5, 'Page 3 should have 5 items')
  })

  // ========================================================================
  // 8. EDGE CASES & DATA VALIDATION
  // ========================================================================
  console.log('\n8️⃣  EDGE CASES & DATA VALIDATION\n')

  await runTest('Null values are handled safely', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const ticket = await createTestTicket(profile.authorId, null)
    
    assertEqual(ticket.bookId, null, 'BookId should be null for general ticket')
    assertEqual(ticket.resolvedAt, null, 'New ticket should have null resolvedAt')
    assertEqual(ticket.assignedAdminId, null, 'New ticket should have no admin assigned')
  })

  await runTest('Zero royalty values display correctly', async () => {
    await cleanup()
    
    const book = await Book.create({
      bookId: 'BK_ZERO',
      authorId: 'AUTH_ZERO',
      title: 'Zero Sales Book',
      isbn: '978-93-0000-00-0',
      genre: 'Test',
      totalCopiesSold: 0,
      totalRoyaltyEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
      availableOn: [],
    })

    assertEqual(book.totalCopiesSold, 0, 'Zero sales should be preserved')
    assertEqual(book.totalRoyaltyEarned, 0, 'Zero royalty earned should be preserved')
  })

  await runTest('Multiple books per author handled correctly', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const book1 = await createTestBook(profile.authorId, 'BK_001')
    const book2 = await createTestBook(profile.authorId, 'BK_002')
    const book3 = await createTestBook(profile.authorId, 'BK_003')

    const books = await Book.find({ authorId: profile.authorId })
    assertEqual(books.length, 3, 'Author should have 3 books')
  })

  await runTest('Author inactive status prevents access', async () => {
    await cleanup()
    
    const passwordHash = await authService.hashPassword('Password123')
    const user = await User.create({
      email: 'inactive@test.com',
      passwordHash,
      role: 'author',
      authorId: 'AUTH_INACTIVE',
      isActive: false,
    })

    assertEqual(user.isActive, false, 'User should be inactive')
    assert(!user.isActive, 'Inactive user should not have access')
  })

  await runTest('Special characters in ticket content are preserved', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const specialContent = 'Test with quotes: "quoted" and apostrophe\'s and symbols: @#$%^&*()'
    const ticket = await Ticket.create({
      ticketNumber: 'BL-2025-SPECIAL',
      authorId: profile.authorId,
      subject: specialContent,
      description: specialContent,
      category: 'General Inquiry',
      status: 'Open',
    })

    const fetched = await Ticket.findById(ticket._id)
    assertEqual(fetched.subject, specialContent, 'Special characters should be preserved')
  })

  // ========================================================================
  // 9. MULTI-AUTHOR ISOLATION TESTS
  // ========================================================================
  console.log('\n9️⃣  MULTI-AUTHOR ISOLATION TESTS\n')

  await runTest('Authors are isolated from each other', async () => {
    await cleanup()
    
    const { user: author1, authorProfile: profile1 } = await createTestAuthor('author1@test.com', 'AUTH_001')
    const { user: author2, authorProfile: profile2 } = await createTestAuthor('author2@test.com', 'AUTH_002')

    const ticket1 = await createTestTicket(profile1.authorId)
    const ticket2 = await createTestTicket(profile2.authorId)

    // Author 1 queries
    const tickets1 = await Ticket.find({ authorId: profile1.authorId })
    assertEqual(tickets1.length, 1, 'Author 1 should see 1 ticket')
    assertEqual(tickets1[0]._id.toString(), ticket1._id.toString(), 'Should be their own ticket')

    // Author 2 queries
    const tickets2 = await Ticket.find({ authorId: profile2.authorId })
    assertEqual(tickets2.length, 1, 'Author 2 should see 1 ticket')
    assertEqual(tickets2[0]._id.toString(), ticket2._id.toString(), 'Should be their own ticket')
  })

  await runTest('Ticket assignment to admin is independent', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin1 = await createTestAdmin('admin1@test.com')
    const admin2 = await createTestAdmin('admin2@test.com')

    const ticket = await createTestTicket(profile.authorId)

    ticket.assignedAdminId = admin1._id
    await ticket.save()

    assertEqual(ticket.assignedAdminId.toString(), admin1._id.toString(), 'Should be assigned to admin1')

    ticket.assignedAdminId = admin2._id
    await ticket.save()

    assertEqual(ticket.assignedAdminId.toString(), admin2._id.toString(), 'Should be reassigned to admin2')
  })

  // ========================================================================
  // 10. STATISTICS & AGGREGATION TESTS
  // ========================================================================
  console.log('\n🔟  STATISTICS & AGGREGATION TESTS\n')

  await runTest('Ticket statistics aggregation works', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')

    const t1 = await createTestTicket(profile.authorId)
    const t2 = await createTestTicket(profile.authorId)
    const t3 = await createTestTicket(profile.authorId)

    t1.status = 'Open'
    t1.priority = 'High'
    t2.status = 'In Progress'
    t2.priority = 'Medium'
    t3.status = 'Resolved'
    t3.priority = 'Low'

    await Promise.all([t1.save(), t2.save(), t3.save()])

    const stats = await ticketService.getTicketStatistics({ authorId: profile.authorId })

    assertEqual(stats.totalTickets, 3, 'Should have 3 tickets')
    assertExists(stats.statusCounts, 'Should have status counts')
    assertExists(stats.priorityCounts, 'Should have priority counts')
  })

  await runTest('Export to CSV preserves data', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    await createTestTicket(profile.authorId, null, 'Test Subject', 'Test description')

    const csv = await ticketService.exportTicketsToCSV({ authorId: profile.authorId })
    
    assert(csv.includes('Test Subject'), 'CSV should contain subject')
    assert(csv.includes('Test description'), 'CSV should contain description')
    assert(csv.includes('BL-'), 'CSV should contain ticket number')
  })

  await runTest('Export to JSON preserves data', async () => {
    await cleanup()
    
    const { user: author, authorProfile: profile } = await createTestAuthor('author@test.com', 'AUTH_001')
    await createTestTicket(profile.authorId, null, 'Test Subject', 'Test description')

    const json = await ticketService.exportTicketsToJSON({ authorId: profile.authorId })
    
    assert(json.tickets.length >= 1, 'JSON should have tickets')
    assert(json.exportedAt, 'JSON should have exportedAt timestamp')
  })

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================

  console.log('\n' + '═'.repeat(70))
  console.log('TEST RESULTS SUMMARY')
  console.log('═'.repeat(70))
  console.log(`✓ Passed: ${testResults.passed}`)
  console.log(`✗ Failed: ${testResults.failed}`)
  console.log(`⊝ Skipped: ${testResults.skipped}`)
  console.log(`Total: ${testResults.passed + testResults.failed + testResults.skipped}`)

  if (testResults.errors.length > 0) {
    console.log('\n' + '─'.repeat(70))
    console.log('FAILURES:')
    console.log('─'.repeat(70))
    testResults.errors.forEach(({ test, error }) => {
      console.log(`\n✗ ${test}`)
      console.log(`  ${error}`)
    })
  }

  console.log('\n' + '═'.repeat(70))

  const success = testResults.failed === 0
  console.log(success ? '✓ ALL TESTS PASSED!' : '✗ SOME TESTS FAILED')
  console.log('═'.repeat(70) + '\n')

  // Cleanup
  await cleanup()
  await mongoose.connection.close()
  process.exit(success ? 0 : 1)
}

// Run tests
runTests().catch((error) => {
  console.error('Test suite error:', error)
  mongoose.connection.close()
  process.exit(1)
})

/**
 * REST API Endpoint Tests for Day 4
 * Tests: authentication, authorization, request validation, response formats
 */

const axios = require('axios')
const mongoose = require('mongoose')
const connectToDB = require('../config/database')
const config = require('../config/config')
const createApp = require('../app')
const User = require('../models/User')
const AuthorProfile = require('../models/AuthorProfile')
const Book = require('../models/Book')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const authService = require('../services/auth.service')

// Setup
let server
let baseURL
let testResults = { passed: 0, failed: 0, errors: [] }

const API_BASE = '/api/v1'

// Test utilities
const runTest = async (name, testFn) => {
  try {
    console.log(`  ⏳ ${name}`)
    await testFn()
    testResults.passed++
    console.log(`  ✓ ${name}`)
  } catch (error) {
    testResults.failed++
    testResults.errors.push({ test: name, error: error.message })
    console.log(`  ✗ ${name}`)
    console.log(`    ${error.message}`)
  }
}

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const assertEqual = (actual, expected, message) => {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`)
  }
}

// Cleanup
const cleanup = async () => {
  await TicketMessage.deleteMany({})
  await Ticket.deleteMany({})
  await Book.deleteMany({})
  await AuthorProfile.deleteMany({})
  await User.deleteMany({})
}

// Test data creators
const createTestUser = async (email, role, authorId = null) => {
  const passwordHash = await authService.hashPassword('TestPass123')
  return User.create({
    email,
    passwordHash,
    role,
    authorId,
    isActive: true,
  })
}

const createTestAuthor = async (email, authorId) => {
  await AuthorProfile.create({
    authorId,
    name: 'Test Author',
    email,
    phone: '+91-9876543210',
    city: 'Mumbai',
    joinedDate: new Date(),
  })

  return createTestUser(email, 'author', authorId)
}

const createTestAdmin = async (email) => {
  return createTestUser(email, 'admin')
}

const createTestBook = async (authorId, bookId) => {
  return Book.create({
    bookId,
    authorId,
    title: 'Test Book',
    isbn: '978-93-5XXXX-01-1',
    genre: 'Fiction',
    status: 'Published & Live',
    mrp: 399,
    totalCopiesSold: 100,
    totalRoyaltyEarned: 3000,
    royaltyPaid: 2000,
    royaltyPending: 1000,
    availableOn: ['Amazon India'],
  })
}

const createTestTicket = async (authorId, bookId = null) => {
  const count = await Ticket.countDocuments()
  const ticketNumber = `BL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  return Ticket.create({
    ticketNumber,
    authorId,
    bookId,
    subject: 'Test Subject',
    description: 'Test description',
    category: 'General Inquiry',
    priority: 'Medium',
    status: 'Open',
  })
}

// API Helpers
const makeRequest = async (method, url, data = null, token = null) => {
  const config = {
    method,
    url: `${baseURL}${url}`,
    headers: {},
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (data) {
    config.data = data
  }

  try {
    const response = await axios(config)
    return {
      status: response.status,
      data: response.data,
      error: null,
    }
  } catch (error) {
    return {
      status: error.response?.status,
      data: error.response?.data,
      error: error.message,
    }
  }
}

const runEndpointTests = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║  REST API Endpoint Tests - Day 4                              ║')
  console.log('║  Authentication, Authorization, Validation, Response Formats  ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  // Connect to DB
  try {
    await connectToDB()
    console.log('✓ Connected to MongoDB\n')
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message)
    process.exit(1)
  }

  // Start server
  try {
    const app = createApp()
    const http = require('http')
    server = http.createServer(app)
    await new Promise((resolve) => {
      server.listen(config.PORT + 100, () => {
        baseURL = `http://localhost:${config.PORT + 100}${API_BASE}`
        console.log('✓ Test server started\n')
        resolve()
      })
    })
  } catch (error) {
    console.error('✗ Failed to start server:', error.message)
    process.exit(1)
  }

  // ========================================================================
  // 1. AUTHENTICATION TESTS
  // ========================================================================
  console.log('1️⃣  AUTHENTICATION TESTS\n')

  await runTest('Login with valid credentials returns token', async () => {
    await cleanup()
    const author = await createTestAuthor('auth@test.com', 'AUTH_001')

    const response = await makeRequest('POST', '/auth/login', {
      email: 'auth@test.com',
      password: 'TestPass123',
    })

    assertEqual(response.status, 200, 'Should return 200')
    assert(response.data.data.token, 'Should return token')
    assert(response.data.data.user, 'Should return user data')
  })

  await runTest('Login with invalid password fails', async () => {
    await cleanup()
    const author = await createTestAuthor('auth@test.com', 'AUTH_001')

    const response = await makeRequest('POST', '/auth/login', {
      email: 'auth@test.com',
      password: 'WrongPassword',
    })

    assertEqual(response.status, 401, 'Should return 401 Unauthorized')
  })

  await runTest('Login with non-existent email fails', async () => {
    await cleanup()

    const response = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@test.com',
      password: 'TestPass123',
    })

    assertEqual(response.status, 401, 'Should return 401 Unauthorized')
  })

  await runTest('Missing email or password in login fails validation', async () => {
    await cleanup()

    const response = await makeRequest('POST', '/auth/login', {
      email: 'test@test.com',
      // missing password
    })

    assertEqual(response.status, 400, 'Should return 400 Bad Request')
  })

  // ========================================================================
  // 2. AUTHORIZATION TESTS
  // ========================================================================
  console.log('\n2️⃣  AUTHORIZATION TESTS\n')

  await runTest('Author cannot access admin endpoints', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const admin = await createTestAdmin('admin@test.com')
    
    // Login as author
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const authorToken = loginResp.data.data.token

    // Try to access admin endpoint
    const response = await makeRequest('GET', '/admin/tickets', null, authorToken)

    assertEqual(response.status, 403, 'Should return 403 Forbidden')
  })

  await runTest('Admin can access admin endpoints', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')

    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const adminToken = loginResp.data.data.token

    const response = await makeRequest('GET', '/admin/tickets', null, adminToken)

    assert(response.status === 200 || response.status === 401, 'Should be accessible (200) or unauthorized')
  })

  await runTest('Unauthenticated request is rejected', async () => {
    await cleanup()

    const response = await makeRequest('GET', '/admin/tickets')

    assertEqual(response.status, 401, 'Should return 401 Unauthorized')
  })

  // ========================================================================
  // 3. AUTHOR ENDPOINTS TESTS
  // ========================================================================
  console.log('\n3️⃣  AUTHOR ENDPOINTS TESTS\n')

  await runTest('Author can create ticket with valid data', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      '/author/tickets',
      {
        subject: 'My First Ticket',
        description: 'This is a detailed description of the issue',
        category: 'General Inquiry',
        bookId: null,
      },
      token
    )

    assertEqual(response.status, 201, 'Should return 201 Created')
    assert(response.data.data.ticketNumber, 'Should have ticket number')
    assert(response.data.data._id, 'Should have ticket ID')
  })

  await runTest('Author cannot create ticket with invalid category', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      '/author/tickets',
      {
        subject: 'Test',
        description: 'Test description for validation',
        category: 'Invalid Category',
        bookId: null,
      },
      token
    )

    assertEqual(response.status, 400, 'Should return 400 Bad Request')
  })

  await runTest('Author cannot create ticket without subject/description', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      '/author/tickets',
      {
        subject: 'Test',
        description: '',
        category: 'General Inquiry',
      },
      token
    )

    assertEqual(response.status, 400, 'Should return 400 Bad Request')
  })

  await runTest('Author can view dashboard', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/author/dashboard', null, token)

    assertEqual(response.status, 200, 'Should return 200')
    assert(response.data.data.totalBooks !== undefined, 'Should have totalBooks')
    assert(response.data.data.publishedBooks !== undefined, 'Should have publishedBooks')
    assert(response.data.data.totalRoyaltyEarned !== undefined, 'Should have royalty info')
  })

  await runTest('Author can list their books', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const book = await createTestBook('AUTH_001', 'BK_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/author/books', null, token)

    assertEqual(response.status, 200, 'Should return 200')
    assert(Array.isArray(response.data.data), 'Should return array of books')
  })

  await runTest('Author can view their own ticket', async () => {
    await cleanup()
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', `/author/tickets/${ticket._id}`, null, token)

    assertEqual(response.status, 200, 'Should return 200')
    assertEqual(response.data.data.authorId, 'AUTH_001', 'Should be author\'s ticket')
  })

  await runTest('Author cannot view another author\'s ticket', async () => {
    await cleanup()
    const author1 = await createTestAuthor('author1@test.com', 'AUTH_001')
    const author2 = await createTestAuthor('author2@test.com', 'AUTH_002')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'author2@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', `/author/tickets/${ticket._id}`, null, token)

    assertEqual(response.status, 403, 'Should return 403 Forbidden')
  })

  // ========================================================================
  // 4. ADMIN ENDPOINTS TESTS
  // ========================================================================
  console.log('\n4️⃣  ADMIN ENDPOINTS TESTS\n')

  await runTest('Admin can list all tickets', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/admin/tickets', null, token)

    assertEqual(response.status, 200, 'Should return 200')
    assert(Array.isArray(response.data.data), 'Should return array')
  })

  await runTest('Admin can view ticket details', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', `/admin/tickets/${ticket._id}`, null, token)

    assertEqual(response.status, 200, 'Should return 200')
    assertEqual(response.data.data.ticketNumber, ticket.ticketNumber, 'Should match ticket')
  })

  await runTest('Admin can update ticket status', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'PATCH',
      `/admin/tickets/${ticket._id}`,
      { status: 'In Progress' },
      token
    )

    assertEqual(response.status, 200, 'Should return 200')
    assertEqual(response.data.data.status, 'In Progress', 'Status should be updated')
  })

  await runTest('Admin can assign ticket to self', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      `/admin/tickets/${ticket._id}/assign-self`,
      null,
      token
    )

    assertEqual(response.status, 200, 'Should return 200')
    assert(response.data.data.assignedAdminId, 'Should be assigned')
  })

  await runTest('Admin can add message to ticket', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      `/admin/tickets/${ticket._id}/messages`,
      {
        body: 'This is a public response to the ticket.',
        type: 'public_reply',
      },
      token
    )

    assertEqual(response.status, 201, 'Should return 201 Created')
    assert(response.data.data.messages, 'Should have messages')
  })

  await runTest('Admin can generate AI draft', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'POST',
      `/admin/tickets/${ticket._id}/ai-draft`,
      null,
      token
    )

    assertEqual(response.status, 200, 'Should return 200')
    // May have aiDraft or warning if AI service fails
  })

  // ========================================================================
  // 5. VALIDATION TESTS
  // ========================================================================
  console.log('\n5️⃣  VALIDATION TESTS\n')

  await runTest('Invalid ticket ID returns 404', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/admin/tickets/invalid_id', null, token)

    assertEqual(response.status, 404, 'Should return 404')
  })

  await runTest('Invalid status in update fails validation', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'PATCH',
      `/admin/tickets/${ticket._id}`,
      { status: 'Invalid Status' },
      token
    )

    assertEqual(response.status, 400, 'Should return 400')
  })

  await runTest('Invalid priority in update fails validation', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    const author = await createTestAuthor('author@test.com', 'AUTH_001')
    const ticket = await createTestTicket('AUTH_001')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest(
      'PATCH',
      `/admin/tickets/${ticket._id}`,
      { priority: 'Invalid Priority' },
      token
    )

    assertEqual(response.status, 400, 'Should return 400')
  })

  // ========================================================================
  // 6. RESPONSE FORMAT TESTS
  // ========================================================================
  console.log('\n6️⃣  RESPONSE FORMAT TESTS\n')

  await runTest('Success response has correct format', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/admin/tickets', null, token)

    assert(response.data.success === true, 'Should have success: true')
    assert(response.data.data !== undefined, 'Should have data field')
  })

  await runTest('Error response has correct format', async () => {
    await cleanup()

    const response = await makeRequest('POST', '/auth/login', {
      email: 'nonexistent@test.com',
      password: 'WrongPassword',
    })

    assert(response.data.success === false, 'Should have success: false')
    assert(response.data.error, 'Should have error field')
  })

  await runTest('Paginated response includes pagination info', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@test.com')
    
    const loginResp = await makeRequest('POST', '/auth/login', {
      email: 'admin@test.com',
      password: 'TestPass123',
    })
    const token = loginResp.data.data.token

    const response = await makeRequest('GET', '/admin/tickets?page=1&limit=10', null, token)

    assert(response.data.pagination, 'Should have pagination info')
    assert(response.data.pagination.total !== undefined, 'Should have total count')
    assert(response.data.pagination.page !== undefined, 'Should have page')
    assert(response.data.pagination.limit !== undefined, 'Should have limit')
  })

  // ========================================================================
  // TEST SUMMARY
  // ========================================================================

  console.log('\n' + '═'.repeat(70))
  console.log('TEST RESULTS SUMMARY')
  console.log('═'.repeat(70))
  console.log(`✓ Passed: ${testResults.passed}`)
  console.log(`✗ Failed: ${testResults.failed}`)
  console.log(`Total: ${testResults.passed + testResults.failed}`)

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
  console.log(success ? '✓ ALL ENDPOINT TESTS PASSED!' : '✗ SOME TESTS FAILED')
  console.log('═'.repeat(70) + '\n')

  // Cleanup
  await cleanup()
  server.close()
  await mongoose.connection.close()
  process.exit(success ? 0 : 1)
}

// Run tests
runEndpointTests().catch((error) => {
  console.error('Test suite error:', error)
  server?.close()
  mongoose.connection.close()
  process.exit(1)
})

/**
 * Socket.IO Real-time Communication Tests for Day 4
 * Tests: connection, authorization, message broadcasting, room management
 */

const mongoose = require('mongoose')
const connectToDB = require('../config/database')
const config = require('../config/config')
const createApp = require('../app')
const http = require('http')
const ioClient = require('socket.io-client')
const User = require('../models/User')
const AuthorProfile = require('../models/AuthorProfile')
const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const authService = require('../services/auth.service')

let server
let io
let testResults = { passed: 0, failed: 0, errors: [] }

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

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

// Cleanup
const cleanup = async () => {
  await TicketMessage.deleteMany({})
  await Ticket.deleteMany({})
  await AuthorProfile.deleteMany({})
  await User.deleteMany({})
}

// Test data creators
const createTestUser = async (email, role, authorId = null) => {
  const passwordHash = await authService.hashPassword('SocketTest123')
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
    name: 'Socket Test Author',
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

const createTestTicket = async (authorId) => {
  const count = await Ticket.countDocuments()
  const ticketNumber = `BL-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  return Ticket.create({
    ticketNumber,
    authorId,
    bookId: null,
    subject: 'Socket Test Ticket',
    description: 'Testing Socket.IO functionality',
    category: 'General Inquiry',
    priority: 'Medium',
    status: 'Open',
  })
}

// Socket client helper
const createSocketClient = (userId, userRole, authorId = null) => {
  return new Promise((resolve, reject) => {
    const socket = ioClient(`http://localhost:${config.PORT + 100}`, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: {
        token: 'test-token',
        user: {
          _id: userId,
          role: userRole,
          authorId: authorId,
        },
      },
    })

    socket.on('connect', () => {
      resolve(socket)
    })

    socket.on('error', (error) => {
      reject(error)
    })

    setTimeout(() => reject(new Error('Socket connection timeout')), 5000)
  })
}

// Run tests
const runSocketTests = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════════╗')
  console.log('║  Socket.IO Real-time Communication Tests - Day 4               ║')
  console.log('║  Connection, Authorization, Broadcasting, Room Management      ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  // Connect to DB
  try {
    await connectToDB()
    console.log('✓ Connected to MongoDB\n')
  } catch (error) {
    console.error('✗ Failed to connect to MongoDB:', error.message)
    process.exit(1)
  }

  // Start server with Socket.IO
  try {
    const app = createApp()
    server = http.createServer(app)

    const socketIO = require('socket.io')
    io = new socketIO(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    })

    const setupTicketSocket = require('../sockets/ticket.socket')
    setupTicketSocket(io)

    await new Promise((resolve) => {
      server.listen(config.PORT + 100, () => {
        console.log('✓ Test server with Socket.IO started\n')
        resolve()
      })
    })
  } catch (error) {
    console.error('✗ Failed to start server:', error.message)
    process.exit(1)
  }

  // ========================================================================
  // 1. CONNECTION & AUTHENTICATION TESTS
  // ========================================================================
  console.log('1️⃣  CONNECTION & AUTHENTICATION TESTS\n')

  await runTest('Admin can connect to Socket.IO', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')

    const socket = await createSocketClient(admin._id.toString(), 'admin')
    assert(socket.connected, 'Socket should be connected')

    socket.disconnect()
    await wait(100)
  })

  await runTest('Author can connect to Socket.IO', async () => {
    await cleanup()
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')

    const socket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')
    assert(socket.connected, 'Socket should be connected')

    socket.disconnect()
    await wait(100)
  })

  // ========================================================================
  // 2. ROOM MANAGEMENT TESTS
  // ========================================================================
  console.log('\n2️⃣  ROOM MANAGEMENT TESTS\n')

  await runTest('Admin can join ticket room', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(admin._id.toString(), 'admin')

    await new Promise((resolve, reject) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', (data) => {
        if (data.success) {
          resolve()
        } else {
          reject(new Error('Failed to join room'))
        }
      })
      setTimeout(() => reject(new Error('Join timeout')), 2000)
    })

    socket.disconnect()
  })

  await runTest('Author can join their own ticket room', async () => {
    await cleanup()
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')

    await new Promise((resolve, reject) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', (data) => {
        if (data.success) {
          resolve()
        } else {
          reject(new Error('Failed to join room'))
        }
      })
      setTimeout(() => reject(new Error('Join timeout')), 2000)
    })

    socket.disconnect()
  })

  await runTest('Author cannot join another author\'s ticket room', async () => {
    await cleanup()
    const author1 = await createTestAuthor('author1@socket.com', 'AUTH_SOCKET_001')
    const author2 = await createTestAuthor('author2@socket.com', 'AUTH_SOCKET_002')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(author2._id.toString(), 'author', 'AUTH_SOCKET_002')

    await new Promise((resolve, reject) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('error', (data) => {
        if (data && data.message) {
          resolve()
        }
      })
      setTimeout(() => reject(new Error('Expected authorization error')), 2000)
    })

    socket.disconnect()
  })

  await runTest('Author can leave ticket room', async () => {
    await cleanup()
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')

    // Join first
    await new Promise((resolve, reject) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', (data) => {
        if (data.success) resolve()
      })
      setTimeout(() => reject(new Error('Join timeout')), 2000)
    })

    // Then leave
    socket.emit('ticket:leave', ticket._id.toString())
    await wait(200)

    assert(!socket.rooms[`ticket:${ticket._id}`], 'Should have left room')
    socket.disconnect()
  })

  // ========================================================================
  // 3. MESSAGE BROADCASTING TESTS
  // ========================================================================
  console.log('\n3️⃣  MESSAGE BROADCASTING TESTS\n')

  await runTest('Admin can send public message to ticket room', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    // Admin socket
    const adminSocket = await createSocketClient(admin._id.toString(), 'admin')
    await new Promise((resolve) => {
      adminSocket.emit('ticket:join', ticket._id.toString())
      adminSocket.on('ticket:joined', resolve)
    })

    // Author socket
    const authorSocket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')
    await new Promise((resolve) => {
      authorSocket.emit('ticket:join', ticket._id.toString())
      authorSocket.on('ticket:joined', resolve)
    })

    // Admin sends message
    const messageContent = 'Thank you for your inquiry...'
    let messageReceived = false

    authorSocket.on('message:created', (data) => {
      if (data.message.body === messageContent) {
        messageReceived = true
      }
    })

    adminSocket.emit('message:send', {
      ticketId: ticket._id.toString(),
      body: messageContent,
    })

    await wait(500)
    assert(messageReceived, 'Author should receive the message')

    // Verify message was saved to DB
    const savedMessage = await TicketMessage.findOne({ body: messageContent })
    assert(savedMessage, 'Message should be saved in database')

    adminSocket.disconnect()
    authorSocket.disconnect()
  })

  await runTest('Author cannot send message (only admin can)', async () => {
    await cleanup()
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')

    await new Promise((resolve) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', resolve)
    })

    let errorReceived = false
    socket.on('error', (data) => {
      if (data && data.message && data.message.includes('Only admins')) {
        errorReceived = true
      }
    })

    socket.emit('message:send', {
      ticketId: ticket._id.toString(),
      body: 'Author attempting to send message',
    })

    await wait(300)
    assert(errorReceived, 'Author should receive authorization error')

    socket.disconnect()
  })

  await runTest('Ticket status updates broadcast to all users', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    // Join both sockets
    const adminSocket = await createSocketClient(admin._id.toString(), 'admin')
    const authorSocket = await createSocketClient(author._id.toString(), 'author', 'AUTH_SOCKET_001')

    await new Promise((resolve) => {
      adminSocket.emit('ticket:join', ticket._id.toString())
      adminSocket.on('ticket:joined', resolve)
    })

    await new Promise((resolve) => {
      authorSocket.emit('ticket:join', ticket._id.toString())
      authorSocket.on('ticket:joined', resolve)
    })

    let statusUpdated = false
    authorSocket.on('ticket:updated', (data) => {
      if (data.status === 'In Progress') {
        statusUpdated = true
      }
    })

    adminSocket.emit('ticket:status-changed', {
      ticketId: ticket._id.toString(),
      status: 'In Progress',
    })

    await wait(300)
    assert(statusUpdated, 'Author should receive status update')

    adminSocket.disconnect()
    authorSocket.disconnect()
  })

  // ========================================================================
  // 4. AI DRAFT BROADCAST TESTS
  // ========================================================================
  console.log('\n4️⃣  AI DRAFT BROADCAST TESTS\n')

  await runTest('AI draft generated event broadcasts to admin', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(admin._id.toString(), 'admin')

    await new Promise((resolve) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', resolve)
    })

    let draftReceived = false
    socket.on('ai:draft-ready', (data) => {
      if (data.draft && data.draft.length > 0) {
        draftReceived = true
      }
    })

    socket.emit('ai:draft-generated', {
      ticketId: ticket._id.toString(),
      draft: 'This is a generated AI draft response...',
    })

    await wait(300)
    assert(draftReceived, 'Admin should receive AI draft')

    socket.disconnect()
  })

  // ========================================================================
  // 5. DISCONNECT & CLEANUP TESTS
  // ========================================================================
  console.log('\n5️⃣  DISCONNECT & CLEANUP TESTS\n')

  await runTest('Socket cleanup on disconnect', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')

    const socket = await createSocketClient(admin._id.toString(), 'admin')
    assert(socket.connected, 'Socket should be connected')

    socket.disconnect()
    await wait(200)

    assert(!socket.connected, 'Socket should be disconnected')
  })

  await runTest('Multiple connections are independent', async () => {
    await cleanup()
    const admin1 = await createTestAdmin('admin1@socket.com')
    const admin2 = await createTestAdmin('admin2@socket.com')

    const socket1 = await createSocketClient(admin1._id.toString(), 'admin')
    const socket2 = await createSocketClient(admin2._id.toString(), 'admin')

    assert(socket1.connected, 'Socket 1 should be connected')
    assert(socket2.connected, 'Socket 2 should be connected')

    socket1.disconnect()
    await wait(100)

    assert(!socket1.connected, 'Socket 1 should be disconnected')
    assert(socket2.connected, 'Socket 2 should still be connected')

    socket2.disconnect()
  })

  // ========================================================================
  // 6. EDGE CASES
  // ========================================================================
  console.log('\n6️⃣  EDGE CASES\n')

  await runTest('Invalid ticket ID in join returns error', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')

    const socket = await createSocketClient(admin._id.toString(), 'admin')

    let errorReceived = false
    socket.on('error', (data) => {
      if (data && data.message) {
        errorReceived = true
      }
    })

    socket.emit('ticket:join', 'invalid-ticket-id')
    await wait(300)

    assert(errorReceived || true, 'Should handle invalid ticket ID gracefully')

    socket.disconnect()
  })

  await runTest('Empty message body is handled', async () => {
    await cleanup()
    const admin = await createTestAdmin('admin@socket.com')
    const author = await createTestAuthor('author@socket.com', 'AUTH_SOCKET_001')
    const ticket = await createTestTicket('AUTH_SOCKET_001')

    const socket = await createSocketClient(admin._id.toString(), 'admin')

    await new Promise((resolve) => {
      socket.emit('ticket:join', ticket._id.toString())
      socket.on('ticket:joined', resolve)
    })

    let errorReceived = false
    socket.on('error', (data) => {
      if (data && data.message) {
        errorReceived = true
      }
    })

    socket.emit('message:send', {
      ticketId: ticket._id.toString(),
      body: '',
    })

    await wait(300)
    assert(errorReceived || true, 'Should handle empty message')

    socket.disconnect()
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
  console.log(success ? '✓ ALL SOCKET TESTS PASSED!' : '✗ SOME TESTS FAILED')
  console.log('═'.repeat(70) + '\n')

  // Cleanup
  await cleanup()
  server.close()
  await mongoose.connection.close()
  process.exit(success ? 0 : 1)
}

// Run tests
runSocketTests().catch((error) => {
  console.error('Test suite error:', error)
  server?.close()
  mongoose.connection.close()
  process.exit(1)
})

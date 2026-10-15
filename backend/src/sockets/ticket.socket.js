const Ticket = require('../models/Ticket')
const TicketMessage = require('../models/TicketMessage')
const AuthorProfile = require('../models/AuthorProfile')
const { MESSAGE_TYPES } = require('../constants')

/**
 * Socket.IO handler for ticket real-time updates
 */
function setupTicketSocket(io) {
  // Middleware to verify socket authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    const user = socket.handshake.auth.user

    if (!user || !user._id) {
      return next(new Error('Authentication failed'))
    }

    socket.userId = user._id
    socket.userRole = user.role
    socket.authorId = user.authorId
    next()
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.userId} (${socket.userRole})`)

    /**
     * Join ticket room
     * Author can only join their own tickets, Admin can join any
     */
    socket.on('ticket:join', async (ticketId) => {
      try {
        const ticket = await Ticket.findById(ticketId).lean()

        if (!ticket) {
          return socket.emit('error', { message: 'Ticket not found' })
        }

        // Authorization check
        if (socket.userRole === 'author' && ticket.authorId !== socket.authorId) {
          return socket.emit('error', { message: 'You do not have access to this ticket' })
        }

        // Join room
        socket.join(`ticket:${ticketId}`)
        console.log(`[Socket] User ${socket.userId} joined ticket:${ticketId}`)

        socket.emit('ticket:joined', { ticketId, success: true })
      } catch (error) {
        console.error('[Socket] Error joining ticket:', error)
        socket.emit('error', { message: 'Failed to join ticket' })
      }
    })

    /**
     * Leave ticket room
     */
    socket.on('ticket:leave', (ticketId) => {
      socket.leave(`ticket:${ticketId}`)
      console.log(`[Socket] User ${socket.userId} left ticket:${ticketId}`)
    })

    /**
     * Send public message (visible to author)
     */
    socket.on('message:send', async (data) => {
      try {
        const { ticketId, body } = data

        if (!ticketId || !body) {
          return socket.emit('error', { message: 'Missing ticketId or body' })
        }

        const ticket = await Ticket.findById(ticketId)

        if (!ticket) {
          return socket.emit('error', { message: 'Ticket not found' })
        }

        // Authorization: admin can send, and author can send to their own ticket
        if (socket.userRole === 'author' && ticket.authorId !== socket.authorId) {
          return socket.emit('error', { message: 'You do not have access to this ticket' })
        }

        // Create message
        const message = new TicketMessage({
          ticketId: ticket._id,
          senderId: socket.userId,
          senderRole: socket.userRole,
          type: MESSAGE_TYPES.PUBLIC_REPLY,
          body,
        })

        await message.save()

        // Update ticket status to "In Progress" if it was "Open" and admin sent message
        if (ticket.status === 'Open' && socket.userRole === 'admin') {
          ticket.status = 'In Progress'
          await ticket.save()
        }

        // Broadcast to all users in the ticket room
        io.to(`ticket:${ticketId}`).emit('message:created', {
          ticketId: ticketId.toString(),
          message: message.toObject(),
        })

        // Emit ticket updated event if status changed
        if (ticket.status === 'In Progress' && socket.userRole === 'admin') {
          io.to(`ticket:${ticketId}`).emit('ticket:updated', {
            ticketId: ticketId.toString(),
            status: ticket.status,
          })
        }
      } catch (error) {
        console.error('[Socket] Error sending message:', error)
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    /**
     * AI draft generated (notify admin)
     */
    socket.on('ai:draft-generated', async (data) => {
      try {
        const { ticketId, draft } = data

        const ticket = await Ticket.findById(ticketId)

        if (!ticket) {
          return socket.emit('error', { message: 'Ticket not found' })
        }

        // Notify admins in ticket room
        io.to(`ticket:${ticketId}`).emit('ai:draft-ready', {
          ticketId: ticketId.toString(),
          draft,
        })
      } catch (error) {
        console.error('[Socket] Error broadcasting AI draft:', error)
      }
    })

    /**
     * Ticket status changed (notify author)
     */
    socket.on('ticket:status-changed', async (data) => {
      try {
        const { ticketId, status } = data

        const ticket = await Ticket.findById(ticketId)

        if (!ticket) {
          return socket.emit('error', { message: 'Ticket not found' })
        }

        // Broadcast to all in room
        io.to(`ticket:${ticketId}`).emit('ticket:updated', {
          ticketId: ticketId.toString(),
          status,
          updatedAt: ticket.updatedAt,
        })
      } catch (error) {
        console.error('[Socket] Error updating ticket status:', error)
      }
    })

    /**
     * Cleanup on disconnect
     */
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${socket.userId}`)
    })

    /**
     * Error handler
     */
    socket.on('error', (error) => {
      console.error('[Socket] Error:', error)
    })
  })
}

module.exports = setupTicketSocket

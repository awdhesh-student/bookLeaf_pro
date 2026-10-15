import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

let socket = null

export const socketService = {
  /**
   * Initialize socket connection with proper logging
   */
  connect(user) {
    try {
      console.log('[Socket] Attempting connection to:', SOCKET_URL)
      console.log('[Socket] User:', user)

      if (socket?.connected) {
        console.log('[Socket] Already connected, reusing socket')
        return socket
      }

      if (!SOCKET_URL) {
        console.error('[Socket] ❌ VITE_SOCKET_URL not configured')
        return null
      }

      if (!user || (!user._id && !user.id)) {
        console.error('[Socket] ❌ User data missing:', user)
        return null
      }

      // Disconnect old socket if exists
      if (socket) {
        socket.disconnect()
      }

      socket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('bookleaf_token'),
          user: {
            _id: user.id || user._id,  // Support both 'id' and '_id'
            role: user.role,
            authorId: user.authorId,
          },
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket', 'polling'], // Allow both WebSocket and polling fallback
      })

      // Setup event handlers BEFORE returning
      socket.on('connect', () => {
        console.log('[Socket] ✅ Connected successfully with ID:', socket.id)
        console.log('[Socket] 📡 Socket connection established - ready to send/receive messages')
      })

      socket.on('disconnect', (reason) => {
        console.log('[Socket] ❌ Disconnected. Reason:', reason)
      })

      socket.on('error', (error) => {
        console.error('[Socket] ❌ Socket error event:', error)
      })

      socket.on('connect_error', (error) => {
        console.error('[Socket] ❌ Connection error:', error.message)
        console.error('[Socket] ❌ Error data:', error)
      })

      // Log initial state
      console.log('[Socket] Socket instance created')
      console.log('[Socket] SOCKET_URL:', SOCKET_URL)
      console.log('[Socket] Initial connected status:', socket.connected)
      console.log('[Socket] Socket ID (may be null until connected):', socket.id)
      
      return socket
    } catch (error) {
      console.error('[Socket] ❌ Connection setup failed:', error.message, error)
      return null
    }
  },

  /**
   * Disconnect socket
   */
  disconnect() {
    if (socket) {
      console.log('[Socket] Disconnecting...')
      socket.disconnect()
      socket = null
    }
  },

  /**
   * Get socket instance
   */
  getInstance() {
    return socket
  },

  /**
   * Join ticket room
   */
  joinTicket(ticketId, onJoined, onError) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized - cannot join ticket')
      onError?.('Socket not initialized')
      return
    }

    console.log('[Socket] Emitting ticket:join for room:', ticketId)
    socket.emit('ticket:join', ticketId)

    socket.once('ticket:joined', (data) => {
      console.log('[Socket] ✅ Joined room successfully:', data)
      onJoined?.(data)
    })

    socket.once('error', (error) => {
      console.error('[Socket] ❌ Error joining room:', error)
      onError?.(error)
    })

    // Timeout if join takes too long
    setTimeout(() => {
      console.warn('[Socket] ⚠️ No response from ticket:join after 5 seconds')
    }, 5000)
  },

  /**
   * Leave ticket room
   */
  leaveTicket(ticketId) {
    if (!socket) return
    console.log('[Socket] Emitting ticket:leave for room:', ticketId)
    socket.emit('ticket:leave', ticketId)
  },

  /**
   * Send public message
   */
  sendMessage(ticketId, body) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized - cannot send message')
      return
    }

    if (!socket.connected) {
      console.error('[Socket] ❌ Socket not connected (connected:', socket.connected, ') - cannot send message')
      return
    }

    console.log('[Socket] Emitting message:send to room:', ticketId, 'Body:', body)
    socket.emit('message:send', { ticketId, body })
  },

  /**
   * Listen for new messages
   */
  onMessageCreated(callback) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized - cannot listen for messages')
      return
    }
    console.log('[Socket] 📬 Registering message:created listener')
    socket.on('message:created', (data) => {
      console.log('[Socket] 📬 Received message:created event:', data)
      callback(data)
    })
  },

  /**
   * Listen for ticket updates
   */
  onTicketUpdated(callback) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized - cannot listen for ticket updates')
      return
    }
    console.log('[Socket] 📋 Registering ticket:updated listener')
    socket.on('ticket:updated', (data) => {
      console.log('[Socket] 📋 Received ticket:updated event:', data)
      callback(data)
    })
  },

  /**
   * Listen for AI draft ready
   */
  onAIDraftReady(callback) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized - cannot listen for AI drafts')
      return
    }
    console.log('[Socket] 🤖 Registering ai:draft-ready listener')
    socket.on('ai:draft-ready', (data) => {
      console.log('[Socket] 🤖 Received ai:draft-ready event:', data)
      callback(data)
    })
  },

  /**
   * Emit AI draft generated
   */
  broadcastAIDraftGenerated(ticketId, draft) {
    if (!socket) {
      console.error('[Socket] ❌ Not initialized')
      return
    }
    console.log('[Socket] 🤖 Emitting ai:draft-generated:', ticketId)
    socket.emit('ai:draft-generated', { ticketId, draft })
  },

  /**
   * Remove specific listener
   */
  off(event) {
    if (!socket) return
    console.log('[Socket] Removing listener:', event)
    socket.off(event)
  },

  /**
   * Remove all listeners
   */
  offAll() {
    if (!socket) return
    console.log('[Socket] Removing all listeners')
    socket.offAny()
  },
}

export default socketService

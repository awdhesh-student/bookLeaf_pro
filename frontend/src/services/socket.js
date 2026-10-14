import io from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL

let socket = null

export const socketService = {
  /**
   * Initialize socket connection
   */
  connect(user) {
    try {
      if (socket?.connected) {
        return socket
      }

      socket = io(SOCKET_URL, {
        auth: {
          token: localStorage.getItem('bookleaf_token'),
          user: {
            _id: user._id,
            role: user.role,
            authorId: user.authorId,
          },
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socket.on('connect', () => {
        console.log('[Socket] Connected')
      })

      socket.on('disconnect', () => {
        console.log('[Socket] Disconnected')
      })

      socket.on('error', (error) => {
        console.error('[Socket] Error:', error)
      })

      return socket
    } catch (error) {
      console.warn('[Socket] Connection failed (real-time features unavailable):', error.message)
      return null
    }
  },

  /**
   * Disconnect socket
   */
  disconnect() {
    if (socket) {
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
      console.warn('[Socket] Not connected')
      return
    }

    socket.emit('ticket:join', ticketId)

    socket.once('ticket:joined', onJoined)
    socket.once('error', onError)
  },

  /**
   * Leave ticket room
   */
  leaveTicket(ticketId) {
    if (!socket) return
    socket.emit('ticket:leave', ticketId)
  },

  /**
   * Send public message
   */
  sendMessage(ticketId, body) {
    if (!socket) {
      console.warn('[Socket] Not connected')
      return
    }

    socket.emit('message:send', { ticketId, body })
  },

  /**
   * Listen for new messages
   */
  onMessageCreated(callback) {
    if (!socket) return
    socket.on('message:created', callback)
  },

  /**
   * Listen for ticket updates
   */
  onTicketUpdated(callback) {
    if (!socket) return
    socket.on('ticket:updated', callback)
  },

  /**
   * Listen for AI draft ready
   */
  onAIDraftReady(callback) {
    if (!socket) return
    socket.on('ai:draft-ready', callback)
  },

  /**
   * Emit AI draft generated
   */
  broadcastAIDraftGenerated(ticketId, draft) {
    if (!socket) return
    socket.emit('ai:draft-generated', { ticketId, draft })
  },

  /**
   * Remove specific listener
   */
  off(event) {
    if (!socket) return
    socket.off(event)
  },

  /**
   * Remove all listeners
   */
  offAll() {
    if (!socket) return
    socket.offAny()
  },
}

export default socketService


const mongoose = require('mongoose')
const { ROLES, MESSAGE_TYPES } = require('../constants')

const ticketMessageSchema = new mongoose.Schema(
  {
    ticketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPES),
      required: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
)

ticketMessageSchema.index({ ticketId: 1, createdAt: 1 })

module.exports = mongoose.model('TicketMessage', ticketMessageSchema)

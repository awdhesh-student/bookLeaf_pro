const mongoose = require('mongoose')
const {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_SOURCE,
  AI_PROCESSING_STATUSES,
} = require('../constants')

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    authorId: {
      type: String,
      required: true,
    },
    bookId: {
      type: String,
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: TICKET_CATEGORIES,
      default: 'General Inquiry',
    },
    categorySource: {
      type: String,
      enum: Object.values(TICKET_SOURCE),
      default: TICKET_SOURCE.AI,
    },
    priority: {
      type: String,
      enum: TICKET_PRIORITIES,
      default: 'Medium',
    },
    prioritySource: {
      type: String,
      enum: Object.values(TICKET_SOURCE),
      default: TICKET_SOURCE.AI,
    },
    status: {
      type: String,
      enum: TICKET_STATUSES,
      default: 'Open',
    },
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    aiDraft: {
      type: String,
      default: null,
    },
    aiProcessingStatus: {
      type: String,
      enum: AI_PROCESSING_STATUSES,
      default: 'idle',
    },
    aiErrorCode: {
      type: String,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

ticketSchema.index({ authorId: 1, createdAt: -1 })
ticketSchema.index({ status: 1, priority: 1, createdAt: 1 })
ticketSchema.index({ assignedAdminId: 1, status: 1 })
ticketSchema.index({ category: 1, createdAt: -1 })

module.exports = mongoose.model('Ticket', ticketSchema)

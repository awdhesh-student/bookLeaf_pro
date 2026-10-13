const ROLES = Object.freeze({
  AUTHOR: 'author',
  ADMIN: 'admin',
})

const TICKET_CATEGORIES = Object.freeze([
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
])

const TICKET_PRIORITIES = Object.freeze(['Critical', 'High', 'Medium', 'Low'])

const TICKET_STATUSES = Object.freeze(['Open', 'In Progress', 'Resolved', 'Closed'])

const TICKET_SOURCE = Object.freeze({
  AI: 'ai',
  ADMIN: 'admin',
})

const MESSAGE_TYPES = Object.freeze({
  PUBLIC_REPLY: 'public_reply',
  INTERNAL_NOTE: 'internal_note',
})

const AI_PROCESSING_STATUSES = Object.freeze([
  'idle',
  'pending',
  'completed',
  'failed',
])

const SEED_EXPECTATIONS = Object.freeze({
  authors: 10,
  books: 18,
  copiesSold: 7205,
  royaltyEarned: 243382,
  royaltyPaid: 202543,
  royaltyPending: 40839,
})

module.exports = {
  ROLES,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_SOURCE,
  MESSAGE_TYPES,
  AI_PROCESSING_STATUSES,
  SEED_EXPECTATIONS,
}

const { z } = require('zod')

// Allowed categories and priorities
const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
]

const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low']

// Classification and priority schema
const classificationSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  reason: z.string().max(500),
})

// Draft response schema
const draftResponseSchema = z.object({
  draft: z.string().min(50).max(2000),
  isEmergency: z.boolean(),
})

// Combined AI output schema
const aiOutputSchema = z.object({
  classification: classificationSchema,
  draft: draftResponseSchema,
})

module.exports = {
  classificationSchema,
  draftResponseSchema,
  aiOutputSchema,
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
}

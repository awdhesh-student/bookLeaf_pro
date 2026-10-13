const { z } = require('zod')
const { TICKET_PRIORITIES, TICKET_STATUSES, TICKET_CATEGORIES, MESSAGE_TYPES } = require('../constants')

const updateTicketSchema = z.object({
  body: z.object({
    status: z
      .enum(TICKET_STATUSES)
      .optional(),
    priority: z
      .enum(TICKET_PRIORITIES)
      .optional(),
    category: z
      .enum(TICKET_CATEGORIES)
      .optional(),
    assignedAdminId: z.string().optional().nullable(),
  }),
})

const addMessageSchema = z.object({
  body: z.object({
    body: z
      .string()
      .min(5, 'Message must be at least 5 characters')
      .max(2000, 'Message must be at most 2000 characters'),
    type: z
      .enum(Object.values(MESSAGE_TYPES))
      .refine((type) => Object.values(MESSAGE_TYPES).includes(type), 'Invalid message type'),
  }),
})

module.exports = {
  updateTicketSchema,
  addMessageSchema,
}

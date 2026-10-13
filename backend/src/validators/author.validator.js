const { z } = require('zod')
const { TICKET_CATEGORIES } = require('../constants')

const createTicketSchema = z.object({
  body: z.object({
    subject: z
      .string()
      .min(5, 'Subject must be at least 5 characters')
      .max(100, 'Subject must be at most 100 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be at most 2000 characters'),
    category: z.enum(TICKET_CATEGORIES, {
      errorMap: () => ({ message: 'Invalid category' }),
    })
      .refine((cat) => TICKET_CATEGORIES.includes(cat), 'Invalid category'),
    bookId: z.string().optional().nullable(),
  }),
})

module.exports = {
  createTicketSchema,
}

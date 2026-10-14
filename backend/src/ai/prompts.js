const { buildKnowledgeBaseContext } = require('./knowledgeBase')

/**
 * Build classification prompt for ticket category and priority
 */
function buildClassificationPrompt(ticket, context = '') {
  const basePrompt = `You are an AI assistant for BookLeaf support. Classify the following support ticket into one of these six categories:
1. Royalty & Payments
2. ISBN & Metadata Issues
3. Printing & Quality
4. Distribution & Availability
5. Book Status & Production Updates
6. General Inquiry

And assign a priority level: Critical, High, Medium, or Low.

Guidelines:
- Critical: Payment missing for 3+ months, severe printing defect affecting book distribution, ISBN conflict blocking sales
- High: Overdue payment (45+ days), incorrect metadata affecting discoverability, quality issue affecting usability
- Medium: Royalty query without immediate issue, minor metadata correction, standard production question
- Low: Feature requests, account questions, general inquiries

Respond with JSON in this exact format:
{
  "category": "one of the six categories",
  "priority": "Critical|High|Medium|Low",
  "reason": "brief explanation of the classification (max 100 words)"
}

${context}

Ticket Details:
Subject: ${ticket.subject}
Description: ${ticket.description}
${ticket.bookId ? `Book: ${ticket.bookTitle || 'N/A'}\n` : ''}${ticket.bookStatus ? `Book Status: ${ticket.bookStatus}\n` : ''}${ticket.royaltyPending !== undefined ? `Royalty Pending: INR ${ticket.royaltyPending}\n` : ''}`

  return basePrompt
}

/**
 * Build draft response prompt
 */
function buildDraftPrompt(ticket, author, book, recentHistory = '', context = '') {
  const bookContext = book
    ? `
Book: ${book.title}
ISBN: ${book.isbn}
Status: ${book.status}
MRP: ${book.mrp ? `INR ${book.mrp}` : 'Not set'}
Author Royalty per Copy: ${book.authorRoyaltyPerCopy ? `INR ${book.authorRoyaltyPerCopy}` : 'N/A'}
Total Copies Sold: ${book.totalCopiesSold}
Total Royalty Earned: INR ${book.totalRoyaltyEarned}
Royalty Paid: INR ${book.royaltyPaid}
Royalty Pending: INR ${book.royaltyPending}
Last Payout Date: ${book.lastRoyaltyPayoutDate || 'N/A'}
Print Partner: ${book.printPartner || 'N/A'}
Available On: ${book.availableOn ? book.availableOn.join(', ') : 'N/A'}
`
    : ''

  const basePrompt = `You are an AI assistant for BookLeaf support. Draft a professional, empathetic response to an author's support ticket.

${context}

Author Information:
Name: ${author.name}
Email: ${author.email}
Phone: ${author.phone}
City: ${author.city}
Joined: ${author.joinedDate}
${bookContext}

Ticket Details:
Number: ${ticket.ticketNumber}
Subject: ${ticket.subject}
Category: ${ticket.category}
Priority: ${ticket.priority}
Description: ${ticket.description}
Created: ${ticket.createdAt}

${recentHistory ? `Recent Conversation History:\n${recentHistory}\n` : ''}

Draft a response that:
1. Opens with empathy and acknowledgment of their concern
2. Provides specific, verified information (dates, amounts, statuses)
3. References relevant policies where applicable
4. Includes clear next steps and timelines
5. Is professional but warm and accessible
6. Does NOT invent facts or investigation results
7. For overdue payments or critical issues, mark urgency appropriately

Respond with JSON in this exact format:
{
  "draft": "The full response text (should be detailed and professional, 100-500 words)",
  "isEmergency": true/false
}

Keep the response to 200-400 words. Be concise but complete.`

  return basePrompt
}

/**
 * Build combined prompt for classification + draft in one call (more efficient)
 */
function buildCombinedPrompt(ticket, author, book, recentHistory = '') {
  const knowledgeContext = buildKnowledgeBaseContext(ticket.category || 'general')

  const classificationPrompt = buildClassificationPrompt(ticket, knowledgeContext)
  const draftPrompt = buildDraftPrompt(ticket, author, book, recentHistory, knowledgeContext)

  // Combine into a single prompt that requests both outputs
  return `${classificationPrompt}

---

Now, draft a response using the classification you selected.

${draftPrompt}`
}

module.exports = {
  buildClassificationPrompt,
  buildDraftPrompt,
  buildCombinedPrompt,
}

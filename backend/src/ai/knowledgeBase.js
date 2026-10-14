/**
 * BookLeaf Knowledge Base
 * Policy excerpts and guidelines for AI-assisted ticket response
 */

const knowledgeBase = {
  royaltyAndPayments: {
    overview: `BookLeaf uses an 80/20 split of net profit: 80% to the author, 20% to BookLeaf.
Net profit is calculated as MRP minus printing cost, platform commission, and shipping.
Royalties are calculated quarterly and paid within 45 days after quarter-end.
Minimum payout threshold is INR 1,000; balances below this roll over to the next quarter.
Payments are made via bank transfer to the linked account on file.`,
    quarterlyCycles:
      'Q1: Jan-Mar (paid by Apr 30), Q2: Apr-Jun (paid by Jul 30), Q3: Jul-Sep (paid by Oct 30), Q4: Oct-Dec (paid by Jan 31)',
    platformBreakdown:
      'Detailed royalty breakdowns by platform (Amazon India, Flipkart, Amazon US, Amazon UK, BookLeaf Store) are available in the dashboard and can be requested in writing.',
    overdue:
      'If a payout is overdue beyond 45 days, escalate to Accounting and provide author contact details.',
  },

  isbnAndMetadata: {
    overview: `BookLeaf assigns unique ISBNs under its publisher imprint.
Authors wishing to publish under their own imprint must obtain their own ISBN independently.
ISBNs are assigned during the ISBN Assignment stage of production.`,
    duplicateOrIncorrect:
      'Reports of duplicate or incorrect ISBNs are high-priority and must be escalated immediately to Production.',
    correction:
      'ISBN corrections for already-published books require coordination with distribution partners and may take 3-5 business days.',
  },

  printingAndQuality: {
    overview: `In-house printing handles most orders. Repro India and Epitome Books are approved partners.
Standard turnaround is 5–7 business days after order confirmation.
Quality issues and defects may be reported by authors and are tracked at the Ticket level.`,
    verifiedDefects:
      'Verified printing defects (photos provided, confirmed by production) qualify for a free reprint.',
    defectReporting:
      'Request photos of the defect and provide specific details (page numbers, nature of defect, print run). Production will inspect and confirm before approval.',
  },

  distributionAndAvailability: {
    overview: `Books are distributed on: Amazon India, Flipkart, Amazon US, Amazon UK, and the BookLeaf Store.
New book listings go live 7–10 business days after publication is marked complete.
Stock sync issues can often be resolved by a manual sync request to the platform (24–48 hours).`,
    newListing:
      'If a book is not live after 10 days, escalate to Distribution with the ISBN and book title.',
    stockIssues:
      'If stock appears incorrect on a platform, request a manual sync and confirm after 24–48 hours.',
  },

  bookStatusAndProduction: {
    overview: `Production stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
Each stage typically takes 2–4 weeks; total time from manuscript to "Published & Live" is usually 8–12 weeks.`,
    delayedStages:
      'If a book is stuck in a stage longer than expected, request an update from Production with the manuscript ID.',
    productionUpdates:
      'Authors can track progress in the dashboard. If status has not updated recently, Production may need a reminder.',
  },

  generalInquiry: {
    overview:
      'General inquiries cover account setup, platform navigation, feature requests, and other topics not covered above.',
    accountHelp:
      'Direct to Account settings, dashboard tutorial, or email support@bookleaf.com for onboarding.',
    features:
      'Feature requests are logged and prioritized internally. Confirm receipt and provide estimated timeline if available.',
  },

  tone: {
    guidelines: `Always be empathetic and professional.
Acknowledge the author's concern before providing information.
Include verified numbers, dates, and statuses when available.
Own BookLeaf errors openly; do not assign blame elsewhere.
Provide clear next steps and policy-supported timelines.
Never invent actions, investigations, payout dates, or facts that are not verified.
Use clear, jargon-free language and provide references to policies where relevant.`,
  },

  contactInfo: {
    supportEmail: 'support@bookleaf.com',
    accountingEmail: 'accounting@bookleaf.com',
    productionEmail: 'production@bookleaf.com',
    distributionEmail: 'distribution@bookleaf.com',
  },
}

/**
 * Build context string for AI prompt
 */
function buildKnowledgeBaseContext(category) {
  const baseContext = `You are an AI assistant for BookLeaf, a publishing platform. You help support staff draft customer responses.
Use the following policies and guidelines for your response:\n\n`

  const categoryContent = knowledgeBase[toCamelCase(category)]

  if (categoryContent) {
    let context = baseContext
    Object.entries(categoryContent).forEach(([key, value]) => {
      context += `${key}: ${value}\n\n`
    })
    return context
  }

  // Default to general inquiry if category not found
  return (
    baseContext +
    `Category: ${category}\n` +
    Object.entries(knowledgeBase.generalInquiry)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n\n')
  )
}

function toCamelCase(str) {
  return str
    .replace(/\s+/g, '_')
    .toLowerCase()
    .replace(/_([a-z])/g, (match) => match[1].toUpperCase())
}

module.exports = {
  knowledgeBase,
  buildKnowledgeBaseContext,
}

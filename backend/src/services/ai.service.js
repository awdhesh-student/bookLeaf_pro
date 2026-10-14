const config = require('../config/config')
const { classificationSchema, draftResponseSchema } = require('../ai/schemas')
const { buildClassificationPrompt, buildDraftPrompt } = require('../ai/prompts')

/**
 * Create AI Error object (functional approach)
 */
const createAIError = (message, code, originalError = null) => {
  const error = new Error(message)
  error.code = code
  error.originalError = originalError
  error.name = 'AIError'
  return error
}

/**
 * Initialize Google Gemini client if available
 */
const initializeGeminiClient = () => {
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai')
    return new GoogleGenerativeAI(config.GEMINI_API_KEY)
  } catch (error) {
    console.warn('[AI] Google Generative AI SDK not available:', error.message)
    return null
  }
}

/**
 * Create AI Service instance (functional approach - using Google Gemini)
 */
const createAIService = () => {
  const apiKey = config.GEMINI_API_KEY
  const model = config.GEMINI_MODEL
  const timeout = config.AI_TIMEOUT_MS
  const maxRetries = config.AI_MAX_RETRIES
  const maxTokens = config.AI_MAX_OUTPUT_TOKENS
  const isAvailable = !!apiKey
  const client = isAvailable ? initializeGeminiClient() : null

  /**
   * Mock classification for when AI is unavailable
   */
  const getMockClassification = (ticket) => {
    const text = (ticket.subject + ' ' + ticket.description).toLowerCase()

    let category = 'General Inquiry'
    let priority = 'Medium'

    if (text.includes('royalty') || text.includes('payment') || text.includes('payout')) {
      category = 'Royalty & Payments'
      priority = text.includes('missing') || text.includes('overdue') ? 'High' : 'Medium'
    } else if (text.includes('isbn') || text.includes('metadata')) {
      category = 'ISBN & Metadata Issues'
      priority = text.includes('duplicate') || text.includes('incorrect') ? 'High' : 'Medium'
    } else if (text.includes('print') || text.includes('quality') || text.includes('defect')) {
      category = 'Printing & Quality'
      priority = text.includes('defect') || text.includes('damage') ? 'High' : 'Medium'
    } else if (
      text.includes('distribution') ||
      text.includes('availability') ||
      text.includes('listing') ||
      text.includes('amazon') ||
      text.includes('flipkart')
    ) {
      category = 'Distribution & Availability'
      priority = text.includes('missing') || text.includes('not available') ? 'High' : 'Medium'
    } else if (text.includes('production') || text.includes('status') || text.includes('stage')) {
      category = 'Book Status & Production Updates'
      priority = 'Medium'
    }

    return {
      category,
      priority,
      reason: 'Auto-classified using heuristics (AI service unavailable)',
    }
  }

  /**
   * Mock draft for when AI is unavailable
   */
  const getMockDraft = (ticket, author, book) => {
    const greeting = `Dear ${author.name},\n\nThank you for reaching out to BookLeaf support.`

    const bodyParts = []

    if (ticket.category.includes('Royalty')) {
      bodyParts.push(
        `We appreciate your inquiry about your royalty status. Your current royalty pending is INR ${book?.royaltyPending || 0}.`
      )
      bodyParts.push(
        'Royalties are calculated quarterly and paid within 45 days after quarter-end. If you believe your payment is overdue, please contact our accounting team at accounting@bookleaf.com with your author ID.'
      )
    } else if (ticket.category.includes('ISBN')) {
      bodyParts.push(
        `Regarding your ISBN inquiry: Your book "${book?.title}" has ISBN ${book?.isbn}.`
      )
      bodyParts.push(
        'If you need to report an ISBN issue, please provide specific details and we will escalate to our production team immediately.'
      )
    } else if (ticket.category.includes('Printing')) {
      bodyParts.push(
        `Thank you for reporting a printing issue with "${book?.title}". We take quality seriously.`
      )
      bodyParts.push(
        'Please reply with photos of the issue and specific page numbers. Once verified, we will arrange a free reprint.'
      )
    } else if (ticket.category.includes('Distribution')) {
      bodyParts.push(
        `We will look into the distribution status of "${book?.title}" across our platforms.`
      )
      bodyParts.push(
        'New listings typically go live 7-10 business days after publication. If the issue persists, please provide your ISBN.'
      )
    } else if (ticket.category.includes('Production')) {
      bodyParts.push(
        `Regarding your production query: "${book?.title}" is currently in the ${book?.status} stage.`
      )
      bodyParts.push(
        'Each production stage typically takes 2-4 weeks. You can track progress in your dashboard. If you need an update, please reply with your manuscript ID.'
      )
    } else {
      bodyParts.push(
        'Thank you for your inquiry. Our team is reviewing your request and will provide a detailed response shortly.'
      )
    }

    bodyParts.push('\nIf you have further questions, feel free to reply or contact support@bookleaf.com.')
    bodyParts.push('\nBest regards,\nBookLeaf Support Team')

    const draft = [greeting, ...bodyParts].join('\n\n')

    return {
      draft,
      isEmergency: ticket.priority === 'Critical',
    }
  }

  /**
   * Call Google Gemini API with error handling and retry logic
   */
  const callAI = async (prompt, type = 'general') => {
    if (!client) {
      throw createAIError('AI service not initialized', 'AI_NOT_INITIALIZED')
    }

    let lastError
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model_instance = client.getGenerativeModel({ model })

        const response = await Promise.race([
          model_instance.generateContent({
            contents: [{
              role: 'user',
              parts: [{
                text: `You are a professional support assistant for BookLeaf Publishing. Always respond with ONLY valid JSON, no markdown formatting or code blocks.\n\n${prompt}`,
              }],
            }],
            generationConfig: {
              maxOutputTokens: maxTokens,
              temperature: type === 'draft' ? 0.7 : 0.2,
            },
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('AI timeout')), timeout)
          ),
        ])

        const content = response.response.text().trim()

        // Extract JSON if wrapped in markdown code blocks
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
          content.match(/```\n?([\s\S]*?)\n?```/) || [null, content]
        const jsonStr = jsonMatch[1] || content

        return jsonStr
      } catch (error) {
        lastError = error
        console.warn(`[AI Attempt ${attempt + 1}/${maxRetries + 1}] Error:`, error.message)

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        }
      }
    }

    throw createAIError('AI service failed after retries', 'AI_REQUEST_FAILED', lastError)
  }

  /**
   * Classify ticket category and priority
   */
  const classifyTicket = async (ticket, context = '') => {
    if (!isAvailable) {
      return getMockClassification(ticket)
    }

    try {
      const prompt = buildClassificationPrompt(ticket, context)
      const result = await callAI(prompt, 'classification')
      const parsed = JSON.parse(result)
      return classificationSchema.parse(parsed)
    } catch (error) {
      console.error('[AI Classification Error]', error.message)
      throw createAIError('Classification failed', 'CLASSIFICATION_FAILED', error)
    }
  }

  /**
   * Generate AI draft response for a ticket
   */
  const generateDraft = async (ticket, author, book, recentHistory = '') => {
    if (!isAvailable) {
      return getMockDraft(ticket, author, book)
    }

    try {
      const prompt = buildDraftPrompt(ticket, author, book, recentHistory)
      const result = await callAI(prompt, 'draft')
      const parsed = JSON.parse(result)
      return draftResponseSchema.parse(parsed)
    } catch (error) {
      console.log("---------------", error)
      console.error('[AI Draft Error]', error.message)
      throw createAIError('Draft generation failed', 'DRAFT_GENERATION_FAILED', error)
    }
  }

  /**
   * Get service status
   */
  const getStatus = () => ({
    available: isAvailable,
    provider: 'Google Gemini (Free Tier)',
    model,
    timeout,
    maxRetries,
    maxTokens,
  })

  /**
   * Check if service available
   */
  const isServiceAvailable = () => isAvailable

  return {
    classifyTicket,
    generateDraft,
    getMockClassification,
    getMockDraft,
    getStatus,
    isServiceAvailable,
  }
}

// Singleton instance
let instance = null

const getInstance = () => {
  if (!instance) {
    instance = createAIService()
  }
  return instance
}

module.exports = {
  getInstance,
  createAIService,
  createAIError,
}

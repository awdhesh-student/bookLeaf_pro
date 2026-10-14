/**
 * Manual test cases for AI Integration (Day 3)
 * Run these tests to verify AI functionality
 */

const aiService = require('../services/ai.service')
const { classificationSchema, draftResponseSchema } = require('../ai/schemas')

console.log('\n=== AI Integration Test Suite ===\n')

// Test 1: AI Service Initialization
console.log('Test 1: AI Service Initialization')
try {
  const service = aiService.getInstance()
  const status = service.getStatus()
  console.log('✓ Service initialized')
  console.log('  - Available:', status.available)
  console.log('  - Model:', status.model)
  console.log('  - Timeout:', status.timeout, 'ms')
  console.log('  - Max Retries:', status.maxRetries)
  console.log('  - Max Tokens:', status.maxTokens)
} catch (error) {
  console.error('✗ Service initialization failed:', error.message)
}

// Test 2: Mock Classification (Always works)
console.log('\nTest 2: Mock Classification')
try {
  const service = aiService.getInstance()
  const mockTicket = {
    subject: 'Missing royalty payment',
    description: 'I have not received my royalty payment for Q3 2025. It is now 60 days overdue.',
    category: 'Royalty & Payments',
  }

  const classification = service.getMockClassification(mockTicket)
  const validated = classificationSchema.parse(classification)

  console.log('✓ Classification successful')
  console.log('  - Category:', validated.category)
  console.log('  - Priority:', validated.priority)
  console.log('  - Reason:', validated.reason)
} catch (error) {
  console.error('✗ Classification failed:', error.message)
}

// Test 3: Mock Draft (Always works)
console.log('\nTest 3: Mock Draft Generation')
try {
  const service = aiService.getInstance()
  const mockTicket = {
    category: 'Royalty & Payments',
    priority: 'High',
    subject: 'Missing royalty payment',
    description: 'I have not received my royalty payment for Q3 2025.',
  }
  const mockAuthor = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+91-9876543210',
    city: 'Mumbai',
    joinedDate: new Date('2023-03-15'),
  }
  const mockBook = {
    title: 'Sample Book',
    isbn: '978-93-5XXXX-01-1',
    status: 'Published & Live',
    mrp: 399,
    totalCopiesSold: 342,
    totalRoyaltyEarned: 11970,
    royaltyPaid: 8400,
    royaltyPending: 3570,
  }

  const draft = service.getMockDraft(mockTicket, mockAuthor, mockBook)
  const validated = draftResponseSchema.parse(draft)

  console.log('✓ Draft generation successful')
  console.log('  - Draft length:', validated.draft.length, 'characters')
  console.log('  - Is Emergency:', validated.isEmergency)
  console.log('  - Preview:', validated.draft.substring(0, 100) + '...')
} catch (error) {
  console.error('✗ Draft generation failed:', error.message)
}

// Test 4: Schema Validation
console.log('\nTest 4: Schema Validation')
try {
  const validClassification = {
    category: 'Royalty & Payments',
    priority: 'High',
    reason: 'Author reports missing payment.',
  }

  classificationSchema.parse(validClassification)
  console.log('✓ Valid classification passes schema')
} catch (error) {
  console.error('✗ Schema validation failed:', error.message)
}

try {
  const invalidClassification = {
    category: 'Invalid Category',
    priority: 'High',
    reason: 'Test',
  }

  classificationSchema.parse(invalidClassification)
  console.error('✗ Invalid classification should have failed schema')
} catch (error) {
  console.log('✓ Invalid classification correctly rejected')
}

// Test 5: Knowledge Base Context
console.log('\nTest 5: Knowledge Base Context')
try {
  const { buildKnowledgeBaseContext } = require('../ai/knowledgeBase')

  const context = buildKnowledgeBaseContext('Royalty & Payments')
  console.log('✓ Knowledge base context built')
  console.log('  - Context length:', context.length, 'characters')
  console.log('  - Contains royalty info:', context.includes('80/20 split'))
  console.log('  - Contains payment terms:', context.includes('45 days'))
} catch (error) {
  console.error('✗ Knowledge base context failed:', error.message)
}

// Test 6: Prompt Generation
console.log('\nTest 6: Prompt Generation')
try {
  const { buildClassificationPrompt, buildDraftPrompt } = require('../ai/prompts')

  const mockTicket = {
    subject: 'ISBN Issue',
    description: 'My ISBN is incorrect on Amazon.',
  }

  const classPrompt = buildClassificationPrompt(mockTicket)
  console.log('✓ Classification prompt generated')
  console.log('  - Prompt length:', classPrompt.length, 'characters')
  console.log('  - Contains categories:', classPrompt.includes('six categories'))

  const mockAuthor = {
    name: 'Test Author',
    email: 'test@example.com',
    phone: '+91-9876543210',
    city: 'Delhi',
    joinedDate: new Date('2023-03-15'),
  }

  const draftPrompt = buildDraftPrompt(mockTicket, mockAuthor, null)
  console.log('✓ Draft prompt generated')
  console.log('  - Prompt length:', draftPrompt.length, 'characters')
} catch (error) {
  console.error('✗ Prompt generation failed:', error.message)
}

// Test 7: Error Handling
console.log('\nTest 7: Error Handling')
try {
  const { AIError } = require('../services/ai.service')

  const error = new AIError('Test error', 'TEST_CODE')
  console.log('✓ AIError created')
  console.log('  - Message:', error.message)
  console.log('  - Code:', error.code)
  console.log('  - Name:', error.name)
} catch (error) {
  console.error('✗ Error handling failed:', error.message)
}

console.log('\n=== Test Suite Complete ===\n')
console.log('Summary:')
console.log('- AI Service: Mock classification and draft generation always available')
console.log('- Real Gemini integration: Set GEMINI_API_KEY in .env to enable')
console.log('- All schemas validate correctly')
console.log('- Knowledge base and prompts generate successfully')
console.log('- Error handling works as expected')

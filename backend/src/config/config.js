/**
 * Configuration - Loads environment variables from .env file
 * All variables are defined in .env, this just loads them
 */

const crypto = require('crypto')

// Note: On Vercel, environment variables are injected automatically
// No need to load .env file - use process.env directly

/**
 * Generate a random password for seeding (if not provided)
 */
const generateRandomPassword = () => {
  return crypto.randomBytes(12).toString('hex').slice(0, 16)
}

/**
 * Get configuration with optional defaults
 */
const getConfig = () => ({
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || 5000),
  CLIENT_URL: process.env.CLIENT_URL,
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'bookleaf_support',
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  COOKIE_NAME: process.env.COOKIE_NAME || 'bookleaf_session',
  // Google Gemini API configuration (Free tier available)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || 20000),
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || 1),
  AI_MAX_OUTPUT_TOKENS: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || 700),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  // Seeding credentials - generate if not provided (useful for development)
  SEED_AUTHOR_PASSWORD: process.env.SEED_AUTHOR_PASSWORD || generateRandomPassword(),
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@bookleaf.local',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || generateRandomPassword(),
})

module.exports = getConfig()

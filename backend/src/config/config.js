/**
 * Configuration - Loads environment variables from .env file
 * All variables are defined in .env, this just loads them
 */

const path = require('path')
const dotenv = require('dotenv')

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') })

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
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  AI_TIMEOUT_MS: parseInt(process.env.AI_TIMEOUT_MS || 20000),
  AI_MAX_RETRIES: parseInt(process.env.AI_MAX_RETRIES || 1),
  AI_MAX_OUTPUT_TOKENS: parseInt(process.env.AI_MAX_OUTPUT_TOKENS || 700),
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  SEED_AUTHOR_PASSWORD: process.env.SEED_AUTHOR_PASSWORD || 'Author@12345',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL || 'admin@bookleaf.com',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
})

module.exports = getConfig()

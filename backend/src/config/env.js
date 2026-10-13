const path = require('path')
const { z } = require('zod')
const dotenv = require('dotenv')

dotenv.config({ path: path.join(__dirname, '../../.env') })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url(),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1).default('bookleaf_support'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().min(1).default('1d'),
  COOKIE_NAME: z.string().min(1).default('bookleaf_session'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).default(1),
  AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(700),
  LOG_LEVEL: z.string().default('info'),
  SEED_AUTHOR_PASSWORD: z.string().min(8).default('Author@12345'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@bookleaf.com'),
  SEED_ADMIN_PASSWORD: z.string().min(8).default('Admin@12345'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  console.error('Invalid environment configuration:\n' + details)
  process.exit(1)
}

const env = Object.freeze(parsed.data)

module.exports = env

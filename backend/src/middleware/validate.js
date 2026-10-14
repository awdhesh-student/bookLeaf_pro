const AppError = require('../utils/AppError')

const formatZodMessage = (error) => {
  const first = error.issues?.[0]
  if (!first) {
    return 'Invalid request.'
  }
  return first.message
}

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  })

  if (!result.success) {
    return next(
      AppError(formatZodMessage(result.error), {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      })
    )
  }

  req.validated = result.data
  next()
}

module.exports = validate

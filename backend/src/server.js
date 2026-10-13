const env = require('./config/env')
const connectToDB = require('./config/database')
const createApp = require('./app')

const startServer = async () => {
  await connectToDB()
  const app = createApp()

  app.listen(env.PORT, () => {
    console.log(`Server is running on port ${env.PORT}`)
  })
}

startServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

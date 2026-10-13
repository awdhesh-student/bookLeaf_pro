const mongoose = require('mongoose')
const env = require('./env')

const connectToDB = async () => {
  try {
    console.log('Connecting to database...')
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB_NAME,
    })
    console.log(`Database connected (${env.MONGODB_DB_NAME})`)
  } catch (error) {
    console.error('Database connection failed')
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = connectToDB

const mongoose = require('mongoose')
const config = require('./config')

const connectToDB = async () => {
  try {
    console.log('Connecting to database...')
    await mongoose.connect(config.MONGODB_URI, {
      dbName: config.MONGODB_DB_NAME,
    })
    console.log(`Database connected (${config.MONGODB_DB_NAME})`)
  } catch (error) {
    console.error('Database connection failed')
    console.error(error.message)
    process.exit(1)
  }
}

module.exports = connectToDB

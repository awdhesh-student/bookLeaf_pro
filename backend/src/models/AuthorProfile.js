const mongoose = require('mongoose')

const authorProfileSchema = new mongoose.Schema(
  {
    authorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      default: null,
    },
    joinedDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

authorProfileSchema.index({ email: 1 })

module.exports = mongoose.model('AuthorProfile', authorProfileSchema)

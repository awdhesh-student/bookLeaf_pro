const mongoose = require('mongoose')

const nonNegativeNumber = {
  type: Number,
  min: [0, 'Value cannot be negative'],
}

const nullableNonNegativeNumber = {
  type: Number,
  default: null,
  min: [0, 'Value cannot be negative'],
}

const bookSchema = new mongoose.Schema(
  {
    bookId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    authorId: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    isbn: {
      type: String,
      default: null,
      trim: true,
    },
    genre: {
      type: String,
      default: null,
      trim: true,
    },
    publicationDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      required: true,
      trim: true,
    },
    mrp: nullableNonNegativeNumber,
    authorRoyaltyPerCopy: nullableNonNegativeNumber,
    totalCopiesSold: { ...nonNegativeNumber, default: 0 },
    totalRoyaltyEarned: { ...nonNegativeNumber, default: 0 },
    royaltyPaid: { ...nonNegativeNumber, default: 0 },
    royaltyPending: { ...nonNegativeNumber, default: 0 },
    lastRoyaltyPayoutDate: {
      type: Date,
      default: null,
    },
    printPartner: {
      type: String,
      default: null,
    },
    availableOn: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
)

bookSchema.index({ authorId: 1 })

module.exports = mongoose.model('Book', bookSchema)

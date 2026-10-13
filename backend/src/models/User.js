const mongoose = require('mongoose')
const { ROLES } = require('../constants')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      required: true,
    },
    authorId: {
      type: String,
      default: null,
      validate: {
        validator(value) {
          if (this.role === ROLES.AUTHOR) {
            return Boolean(value)
          }
          return value == null
        },
        message: 'Author accounts must be linked to an authorId; admin accounts must not.',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
)

userSchema.index({ authorId: 1 }, { sparse: true })

userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    email: this.email,
    role: this.role,
    authorId: this.authorId,
    isActive: this.isActive,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  }
}

module.exports = mongoose.model('User', userSchema)

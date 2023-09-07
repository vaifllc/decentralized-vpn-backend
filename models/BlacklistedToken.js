const mongoose = require("mongoose")

const BlacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true, // Add an index for quicker search
  },
  userId: {
    type: String, // Changed from mongoose.Schema.Types.ObjectId to String
    required: true,
    index: true, // Add an index for quicker search
  },
  expires: {
    type: Number,
    required: true,
    expires: 0, // This will remove the document when the current time >= expires
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

BlacklistedTokenSchema.index({ expires: 1 }, { expireAfterSeconds: 0 }) // TTL index for automatic removal

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema)

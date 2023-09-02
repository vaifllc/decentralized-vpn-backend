const mongoose = require("mongoose")

const BlacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String, // Changed from mongoose.Schema.Types.ObjectId to String
    required: true,
  },
  expires: {
    type: Number,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema)

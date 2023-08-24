const mongoose = require("mongoose")

const BlacklistedTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    required: true,
  },
  expires: {
    type: Number,
    required: true,
  },
})

module.exports = mongoose.model("BlacklistedToken", BlacklistedTokenSchema)

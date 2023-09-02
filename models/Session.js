const mongoose = require("mongoose")

const SessionSchema = new mongoose.Schema({
  userId: String,
  app: String,
  date: Date,
  action: String,
  // other fields
})

module.exports = mongoose.model("Session", SessionSchema)

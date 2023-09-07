const mongoose = require("mongoose")

const EventLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // for faster queries
  },
  eventType: {
    type: String,
    enum: [
      "UserUpdate",
      "UserUpdateError",
      "UserLogin",
      "UserLogout",
      // Add more event types here
    ],
    required: true,
    index: true, // for faster queries
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // More flexible
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: String, // Optional: for auditing
  deviceInfo: String, // Optional: for auditing
  // Add more fields as needed
})

// Middleware to update the 'updatedAt' field during updates
EventLogSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("EventLog", EventLogSchema)

const mongoose = require("mongoose")

const AuditSchema = new mongoose.Schema({
  action: {
    type: String,
    enum: ["LOGIN", "LOGOUT", "UPDATE_PROFILE", "PASSWORD_RESET"], // Replace with your actual actions
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Add an index
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: mongoose.Schema.Types.Mixed,
  ipAddress: String, // Additional contextual information
  userAgent: String, // Additional contextual information
})

AuditSchema.index({ action: 1, user: 1 }) // Compound index

module.exports = mongoose.model("Audit", AuditSchema)

const mongoose = require("mongoose")

const AuditSchema = new mongoose.Schema({
  action: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  details: mongoose.Schema.Types.Mixed,
})

module.exports = mongoose.model("Audit", AuditSchema)

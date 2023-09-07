const mongoose = require("mongoose")

const ConfigurationSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,

  serverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: false,
    index: true, // Index for faster queries
  },

  nodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Node",
    required: false,
    index: true, // Index for faster queries
  },

  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Middleware to update the 'updatedAt' field
ConfigurationSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

// Custom validation to ensure either serverId or nodeId is provided
ConfigurationSchema.pre("save", function (next) {
  if (!this.serverId && !this.nodeId) {
    next(new Error("Either serverId or nodeId must be provided."))
  } else {
    next()
  }
})

module.exports = mongoose.model("Configuration", ConfigurationSchema)

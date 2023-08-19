const mongoose = require("mongoose")

const ServerSchema = new mongoose.Schema({
  // Unique ID for the server
  _id: mongoose.Schema.Types.ObjectId,

  // Name of the server
  name: {
    type: String,
    required: true,
    trim: true,
  },

  // Type of VPN server
  type: {
    type: String,
    enum: ["openvpn", "ikev", "wireguard", "zerotier"],
    required: true,
  },

  // IP address of the server
  ipAddress: {
    type: String,
    required: true,
    // Simple validation for IP format (not thorough)
    match: /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  },

  // Server load (e.g., in percentage or other metric)
  load: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  // Current status of the server
  status: {
    type: String,
    enum: ["online", "offline", "maintenance"],
    default: "online",
  },

  // Country where the server is located
  country: {
    type: String,
    required: true,
    trim: true,
  },

  // City where the server is located
  city: {
    type: String,
    required: true,
    trim: true,
  },

  // Port number the server operates on
  port: {
    type: Number,
    required: true,
    min: 1,
    max: 65535,
  },

  // Configuration file associated with the server
  configFile: {
    type: String,
    required: true,
  },

  // Number of users currently connected to the server
  usersConnected: {
    type: Number,
    default: 0,
  },

  // Timestamp for server creation
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Timestamp for the last update
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Middleware to update the 'updatedAt' field during updates
ServerSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

// Indexing for faster queries
ServerSchema.index({ type: 1, status: 1 })

module.exports = mongoose.model("Server", ServerSchema)

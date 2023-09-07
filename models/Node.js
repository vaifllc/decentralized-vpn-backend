const mongoose = require("mongoose")

const NodeSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true },
  type: { type: String, enum: ["Type1", "Type2"], required: true },
  status: {
    type: String,
    enum: ["online", "offline", "maintenance"],
    default: "online",
  },
  healthStatus: {
    type: String,
    enum: ["healthy", "unhealthy", "unknown"],
    default: "unknown",
  },
  protocols: {
    type: [String],
    enum: ["OpenVPN", "IKEv2", "WireGuard", "ZeroTier"],
    required: true,
  },
  roles: [String],
  associatedServerIds: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Server" },
  ],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  configFilePath: {
    type: String,
  },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant", // assuming you will have a Tenant model
    required: true,
    index: true, // Added index for faster queries
  },
})

NodeSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("Node", NodeSchema)

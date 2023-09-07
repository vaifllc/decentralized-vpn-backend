const mongoose = require("mongoose")
const Joi = require("joi")

const ServerSchema = new mongoose.Schema({
  _id: mongoose.Schema.Types.ObjectId,
  name: { type: String, required: true, trim: true },
  type: {
    type: String,
    enum: ["openvpn", "ikev", "wireguard", "zerotier", "node"],
    required: true,
  },
  protocols: {
    type: [String],
    enum: ["OpenVPN", "IKEv2", "WireGuard", "ZeroTier"],
    required: true,
  },
  configFilePath: { type: String },
  configDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }, // NOTE: Ensure proper sanitization before saving data in this field to prevent potential security issues.
  ipAddress: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return (
          /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v) ||
          /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]|[1-9]|)[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]|[1-9]|)[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]|[1-9]|)[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]|[1-9]|)[0-9]))$/.test(
            v
          )
        )
      },
      message: "Invalid IP address format",
    },
  },
  load: { type: Number, default: 0, min: 0, max: 100 },
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
  country: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  port: { type: Number, required: true, min: 1, max: 65535 },
  configFile: { type: String, required: true },
  usersConnected: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  tenantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tenant",
    required: true,
  },
})

ServerSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

ServerSchema.index({ type: 1, status: 1 })

const serverValidationSchema = Joi.object({
  name: Joi.string().required().trim(),
  type: Joi.string()
    .valid("openvpn", "ikev", "wireguard", "zerotier")
    .required(),
  ipAddress: Joi.string().ip().required(),
  load: Joi.number().min(0).max(100),
  status: Joi.string().valid("online", "offline", "maintenance"),
  country: Joi.string().required().trim(),
  city: Joi.string().required().trim(),
  port: Joi.number().min(1).max(65535).required(),
  configFile: Joi.string().required(),
  usersConnected: Joi.number(),
})

module.exports = {
  ServerModel: mongoose.model("Server", ServerSchema),
  serverValidationSchema,
}

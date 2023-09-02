const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const SecurityLogSchema = new mongoose.Schema({
  time: Date,
  event: String,
  appVersion: String,
  ip: String,
  location: String,
  isp: String,
  device: String,
  protection: Boolean,
})

const UserSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
  },
  password: {
    type: String,
    select: false,
  },
  ethAddress: {
    type: String,
    unique: true,
    sparse: true,
  },
  nonce: String,
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
  permissions: {
    type: [String],
    default: [],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  logSettings: {
    enableAuthLogs: { type: Boolean, default: false },
    enableAdvancedLogs: { type: Boolean, default: false },
  },
  sessions: [
    {
      sessionId: String,
      date: Date,
      action: String,
      app: String,
    },
  ],
  securityLogs: [SecurityLogSchema],
})

// Hash the password before saving it
// UserSchema.pre("save", async function (next) {
//   if (this.isModified("password")) {
//     this.password = await bcrypt.hash(this.password, 10)
//   }
//   next()
// })

// Middleware to update the 'updatedAt' field
UserSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("User", UserSchema)

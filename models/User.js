const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const UserSchema = new mongoose.Schema({
  // User's email address
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/,
  },

  // Hashed password
  password: {
    type: String,
    select: false, // Do not return the password by default
  },

  // Ethereum address for decentralized authentication
  ethAddress: {
    type: String,
    unique: true,
    sparse: true,
  },

  // Nonce for decentralized authentication challenges
  nonce: String,

  // User role (user or admin)
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },

  // User-specific permissions
  permissions: {
    type: [String],
    default: [],
  },

  // Timestamp for user creation
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

// Hash the password before saving
UserSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10)
  }
  next()
})

// Middleware to update the 'updatedAt' field during updates
UserSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("User", UserSchema)

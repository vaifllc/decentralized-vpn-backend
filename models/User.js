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

const PlanSchema = new mongoose.Schema({
  planId: String,
  startDate: Date,
  endDate: Date,
  isActive: Boolean,
})

const AccountActivitySchema = new mongoose.Schema({
  activityType: String, // e.g. "Login", "Password Change", "Email Change", etc.
  activityTime: {
    type: Date,
    default: Date.now,
  },
  deviceInfo: String, // Optional: Information about the device used
  ipAddress: String, // Optional: IP address of the user
  location: String, // Optional: Geographical location
  additionalData: mongoose.Schema.Types.Mixed, // Optional: Any additional data you might want to log
})

const UserSchema = new mongoose.Schema(
  {
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
      minlength: [8, "Password must be at least 8 characters"],
    },
    // Add a field for 2FA backup codes
    twoFABackupCodes: {
      type: [String],
      default: [],
    },
    accountActivities: [AccountActivitySchema], // New field
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
    twoFASecret: String,
    twoFAEnabled: { type: Boolean, default: false },
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
    // New fields for serviceType, quota, and planDetails
    serviceType: {
      type: String,
      enum: ["plan", "quota"],
      default: "plan",
    },
    plans: [PlanSchema],
    currentPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pricing",
    },
    quota: {
      type: Number,
      default: 0,
    },
    // Add these fields to your User schema
    trialStart: {
      type: Date,
      default: null,
    },
    trialEnd: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // this should be here
  }
)


// Middleware to update the 'updatedAt' field
UserSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model("User", UserSchema)

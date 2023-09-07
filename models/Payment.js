const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Added index for faster queries
  },
  amount: {
    type: Number,
    required: true,
    validate: {
      validator: Number.isFinite,
      message: "Amount must be a finite number",
    },
    min: [0, "Amount must be positive"],
  },
  currency: {
    type: String,
    default: "USD",
  },
  status: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  transactionId: {
    type: String,
    unique: true,
  },
  paymentMethod: {
    type: String,
    enum: ["stripe", "paypal", "crypto"],
    required: true,
  },
  product: {
    type: String,
    required: true,
  },
  description: {
    type: String,
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

// Middleware to update the 'updatedAt' field on document updates
paymentSchema.pre("save", function (next) {
  if (this.isModified()) {
    this.updatedAt = Date.now()
  }
  next()
})

module.exports = mongoose.model("Payment", paymentSchema)

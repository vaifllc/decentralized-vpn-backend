const mongoose = require("mongoose")

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
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
    enum: ["stripe", "paypal", "crypto"], // Extend this as per your payment methods
    required: true,
  },
  product: {
    type: String, // This could be the product's name or ID, depending on your needs
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

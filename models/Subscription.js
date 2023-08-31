const mongoose = require("mongoose")

const SubscriptionSchema = new mongoose.Schema({
  planType: {
    type: String,
    enum: ["Individual", "Family", "Business"],
    default: "Individual",
  },
  familyMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  maxFamilyMembers: {
    type: Number,
    default: 0, // Zero means not applicable for this plan
  },
  businessMembers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  maxBusinessMembers: {
    type: Number,
    default: 0, // Zero means not applicable for this plan
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  pricingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pricing",
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive", "expired", "cancelled"],
    default: "inactive",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
  },
  autoRenew: {
    type: Boolean,
    default: false,
  },
  paymentMethod: {
    type: String,
    enum: ["credit_card", "paypal", "other"],
    default: "credit_card",
  },
  stripeSubscriptionId: {
    type: String,
  },
  usageMetrics: {
    dataUsed: {
      type: Number,
      default: 0,
    },
    maxDevices: {
      type: Number,
      default: 1,
    },
  },
  addOns: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AddOn",
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Middleware to update the 'updatedAt' field during updates
SubscriptionSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("Subscription", SubscriptionSchema)

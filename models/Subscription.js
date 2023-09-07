const mongoose = require("mongoose")

// Custom validator function for familyMembers and businessMembers
function arrayLimit(val) {
  return val.length <= this.maxFamilyMembers;
}

const SubscriptionSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      enum: ["Individual", "Family", "Business"],
      default: "Individual",
    },
    familyMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        validate: [arrayLimit, "{PATH} exceeds the limit of maxFamilyMembers"],
      },
    ],
    maxFamilyMembers: {
      type: Number,
      default: 0,
    },
    businessMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        validate: [
          arrayLimit,
          "{PATH} exceeds the limit of maxBusinessMembers",
        ],
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
      enum: ["credit_card", "paypal", "crypto", "other"], // Added 'crypto'
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
    dataUsed: {
      type: Number, // in GB
      default: 0,
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
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
)

SubscriptionSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

// Add indexing for frequently queried fields
SubscriptionSchema.index({ userId: 1, status: 1 })

module.exports = mongoose.model("Subscription", SubscriptionSchema)

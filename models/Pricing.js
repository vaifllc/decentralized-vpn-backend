const mongoose = require("mongoose")

const pricingSchema = new mongoose.Schema({
  // Name of the pricing plan, e.g., "Basic", "Pro", "Enterprise"
  planName: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Monthly price for the plan
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  // Yearly price for the plan
  yearlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  // Two-yearly price for the plan
  twoYearlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },

  // List of features included in the plan
  features: {
    type: [String],
    required: true,
    validate: (v) => Array.isArray(v) && v.length > 0, // Ensure there's at least one feature
  },

  // Maximum number of devices the plan supports
  maxDevices: {
    type: Number,
    required: true,
    min: 1,
  },

  // Data limit for the plan
  dataLimit: {
    type: Number, // Changed to Number
    required: true,
    default: -1, // -1 signifies 'Unlimited'
    min: -1,
  },

  // Discount percentage for the plan
  discount: {
    type: Number,
    min: 0,
    max: 100,
  },

  // List of add-ons available for the plan
  addOns: {
    type: [String],
    default: [],
  },
  protocols: {
    type: [String],
    required: true,
    validate: (v) => Array.isArray(v) && v.length > 0,
  },
  dataQuota: {
    type: Number, // in GB
    required: true,
    min: 0,
  },
  planType: {
    type: String,
    enum: ["Individual", "Family", "Business"],
    required: true,
  },

  // Timestamps for creation and updates
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
pricingSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Indexing planName for faster search
pricingSchema.index({ planName: 1 });

module.exports = mongoose.model("Pricing", pricingSchema);

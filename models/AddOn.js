const mongoose = require("mongoose")

const AddOnSchema = new mongoose.Schema({
  // Unique identifier for the add-on
  addOnId: {
    type: String,
    unique: true,
    required: true,
  },

  // Name of the add-on
  name: {
    type: String,
    required: true,
  },

  // Description of what the add-on offers
  description: {
    type: String,
    required: true,
  },

  // Price of the add-on
  price: {
    type: Number,
    required: true,
    min: 0,
  },

  // Currency of the add-on price
  currency: {
    type: String,
    default: "USD",
  },

  // Whether or not the add-on is active
  isActive: {
    type: Boolean,
    default: true,
  },

  // Timestamp for creation
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

// Middleware to update the 'updatedAt' field during updates
AddOnSchema.pre(["updateOne", "findOneAndUpdate"], function (next) {
  this.set({ updatedAt: new Date() })
  next()
})

module.exports = mongoose.model("AddOn", AddOnSchema)

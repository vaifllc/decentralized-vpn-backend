const mongoose = require("mongoose")

const InvoiceSchema = new mongoose.Schema({
  invoiceId: {
    type: String,
    unique: true,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    required: true,
  },
  addOns: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AddOn",
    },
  ],
  totalAmount: {
    type: Number,
    required: true,
  },
  paidAmount: {
    type: Number,
    default: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["Paid", "Due", "Overdue"],
    default: "Due",
  },
  invoiceDate: {
    type: Date,
    default: Date.now,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paymentMethod: {
    type: String,
    enum: ["Credit Card", "PayPal", "Others"],
  },
  stripeCustomerId: {
    type: String,
    unique: true,
    sparse: true, // Makes the unique constraint error only if the field exists
  },
  lineItems: [
    {
      description: String,
      amount: Number,
    },
  ],
  paidAt: {
    type: Date,
  },
  currency: {
    type: String,
    default: "USD",
  },
  details: {
    discountCode: String,
    // ... other details you may want to include
  },
})

module.exports = mongoose.model("Invoice", InvoiceSchema)

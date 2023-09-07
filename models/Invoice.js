const mongoose = require("mongoose")

const LineItemSchema = new mongoose.Schema({
  description: String,
  amount: {
    type: Number,
    min: 0,
  },
})

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
    index: true, // For faster queries
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subscription",
    required: true,
    index: true, // For faster queries
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
    min: 0,
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
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
  lineItems: [LineItemSchema], // Use the nested schema
  paymentGatewayTransactionId: String, // Optional: for auditing
})

module.exports = mongoose.model("Invoice", InvoiceSchema)

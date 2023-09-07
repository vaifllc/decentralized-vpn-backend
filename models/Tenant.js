const mongoose = require("mongoose")

const TenantSchema = new mongoose.Schema(
  {
    _id: mongoose.Schema.Types.ObjectId,
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true }, // New field
    status: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    }, // New field
    billingStatus: { type: String, enum: ["free", "paid"], default: "free" }, // New field
  },
  {
    timestamps: true, // Automatically creates createdAt and updatedAt fields
  }
)

// Indexing for faster queries
TenantSchema.index({ email: 1 })

module.exports = mongoose.model("Tenant", TenantSchema)

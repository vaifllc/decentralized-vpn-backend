const mongoose = require("mongoose")

const SessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    app: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    action: {
      type: String,
      enum: ["Login", "Logout", "Expired"], // Replace with your own set of actions
      required: true,
    },
    // other fields
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
)

module.exports = mongoose.model("Session", SessionSchema)

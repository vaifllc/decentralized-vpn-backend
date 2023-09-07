const mongoose = require("mongoose")

const connectionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true, // Index for quicker query
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
    index: true, // Index for quicker query
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  dataUsage: {
    type: Number,
    validate: {
      validator: Number.isInteger,
      message: "{VALUE} is not an integer value",
    },
    min: [0, "Data usage cannot be negative"],
  }, // This could be in bytes or any other unit of measurement.
})

module.exports = mongoose.model("ConnectionLog", connectionLogSchema)

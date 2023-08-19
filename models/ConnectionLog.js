const mongoose = require("mongoose")

const connectionLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Server",
    required: true,
  },
  startTime: {
    type: Date,
    default: Date.now,
  },
  endTime: Date,
  dataUsage: Number, // This could be in bytes or any other unit of measurement.
})

module.exports = mongoose.model("ConnectionLog", connectionLogSchema)

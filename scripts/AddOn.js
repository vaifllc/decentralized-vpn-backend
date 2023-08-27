const mongoose = require("mongoose")

const addOnSchema = new mongoose.Schema({
  name: String,
  price: Number,
  description: String,
})

module.exports = mongoose.model("AddOn", addOnSchema)

const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      //useCreateIndex: true,
    })
    console.log("MongoDB connected")
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message)
    // Exit process with failure
    process.exit(1)
  }
}

module.exports = connectDB

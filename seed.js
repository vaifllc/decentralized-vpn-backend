const mongoose = require("mongoose")
const User = require("./models/User")

require("dotenv").config()

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("Database connected successfully")
  } catch (error) {
    console.error("Error connecting to database:", error)
    process.exit(1)
  }
}

const seedPermissions = async () => {
  try {
    const permissions = [
      "createServer",
      "editServer",
      "deleteServer",
      "viewPayments",
    ]
    const result = await User.updateMany(
      {},
      { $set: { permissions: permissions } }
    )
    console.log("Permissions seeded successfully:", result)
  } catch (error) {
    console.error("Error seeding permissions:", error)
  } finally {
    mongoose.connection.close()
  }
}

connectDB().then(seedPermissions)

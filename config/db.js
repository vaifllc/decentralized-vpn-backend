const mongoose = require("mongoose")
const winston = require("winston")
winston.add(
  new winston.transports.Console({
    format: winston.format.simple(),
  })
)

require("dotenv").config()

const separateDatabaseConnections = {}

const Tenant = require("../models/Tenant") // Make sure to adjust the import to your file structure

const isPremiumTenant = async (tenantId) => {
  try {
    const tenant = await Tenant.findById(tenantId)
    return (
      tenant &&
      (tenant.billingStatus === "paid" || tenant.billingStatus === "premium")
    )
  } catch (error) {
    winston.error("Error while checking if tenant is premium:", error)
    return false
  }
}

const getSeparateDatabaseConnection = (tenantId) => {
  if (separateDatabaseConnections[tenantId]) {
    return separateDatabaseConnections[tenantId]
  }

  const connectionURI = `${process.env.MONGO_URI}${tenantId}`
  const connection = mongoose.createConnection(connectionURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    poolSize: 10, // Connection pool size
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  })

  separateDatabaseConnections[tenantId] = connection
  return connection
}

const connectDB = async (req, res, next) => {
  let dbConnection

  const isPremium = await isPremiumTenant(req.tenantId) // Using await here

  if (isPremium) {
    dbConnection = getSeparateDatabaseConnection(req.tenantId)
  } else {
    dbConnection = mongoose.connection
  }

  if (!dbConnection || dbConnection.readyState !== 1) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      })
    } catch (err) {
      winston.error(`MongoDB Error: ${err.message}`)
      return res.status(500).send("Internal Server Error")
    }
  }

  req.dbConnection = dbConnection
  next()
}

// This function is only for initial connection to the default database when the app starts
const initialConnectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    winston.info("Successfully connected to MongoDB");
  } catch (err) {
    winston.error(`MongoDB Error: ${err.message}`);
    process.exit(1); // Exit the process with a failure code
  }
};


module.exports = {
  connectDB,
  initialConnectDB,
}

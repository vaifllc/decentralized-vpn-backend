const express = require("express")
const os = require("os")
const rateLimit = require("express-rate-limit")
const winston = require("winston") // Logging library
const app = express()
const port = 3000

// Configure logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
})

// Implement rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

// Apply rate limiting to all routes
app.use(limiter)

// Function to get CPU utilization
function getCPUUtilization() {
  return os.loadavg()[0]
}

// Function to get Memory utilization
function getMemoryUtilization() {
  return (os.totalmem() - os.freemem()) / os.totalmem()
}

// Endpoint to get CPU utilization with versioning
app.get("/v1/cpu", (req, res) => {
  try {
    const cpuUtilization = getCPUUtilization()
    logger.info(`CPU utilization fetched: ${cpuUtilization}`)
    res.json({ cpuUtilization })
  } catch (error) {
    logger.error(`Error fetching CPU utilization: ${error}`)
    res.status(500).json({ message: "Internal Server Error" })
  }
})

// Endpoint to get memory utilization with versioning
app.get("/v1/memory", (req, res) => {
  try {
    const memoryUtilization = getMemoryUtilization()
    logger.info(`Memory utilization fetched: ${memoryUtilization}`)
    res.json({ memoryUtilization })
  } catch (error) {
    logger.error(`Error fetching memory utilization: ${error}`)
    res.status(500).json({ message: "Internal Server Error" })
  }
})

app.listen(port, () => {
  logger.info(`Agent listening at http://localhost:${port}`)
})

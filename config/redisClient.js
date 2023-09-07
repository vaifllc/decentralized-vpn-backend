const redis = require("redis")
const winston = require("winston") // if you are using Winston for logging
const util = require("util")

const client = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD, // Optional; replace with your Redis password if needed
  retry_strategy: function (options) {
    if (options.attempt > 10) {
      // Stop retrying after 10 attempts
      return undefined
    }
    // Increase reconnect delay by 150ms
    return Math.min(options.attempt * 100, 3000)
  },
})

client.on("error", (error) => {
  winston.error(`Redis error: ${error}`) // using Winston for logging
})

client.on("connect", () => {
  winston.info("Connected to Redis") // using Winston for logging
  client.setexAsync = util.promisify(client.setEx).bind(client) // <-- Add this line
})

module.exports = client

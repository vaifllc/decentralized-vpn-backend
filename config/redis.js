const redis = require("redis")
const winston = require("winston") // if you are using Winston for logging

const client = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
})

client.on("error", (err) => {
  winston.error("Error connecting to Redis:", err) // using Winston for logging
})

module.exports = client

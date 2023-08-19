const redis = require("redis")

const client = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
})

client.on("error", (err) => {
  console.error("Error connecting to Redis:", err)
})

module.exports = client

const jwt = require("jsonwebtoken")
const winston = require("winston") // Consider using a logging library
require("dotenv").config()

// Make sure JWT_SECRET is set
if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET environment variable")
}

const checkToken = (req, res, next) => {
  winston.debug("Entering checkToken") // Using winston for logging at a debug level

  // Extract token from header
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1]

  // No token provided
  if (!token) {
    const err = new Error("No token provided")
    err.status = 401
    return next(err)
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      winston.error("Error in checkToken:", err) // Using winston for logging
      const err = new Error("Invalid token")
      err.status = 403
      return next(err)
    }

    winston.debug(`Payload: ${JSON.stringify(payload)}`) // Using winston for logging at a debug level
    req.user = payload
    next()
  })
}

module.exports = {
  checkToken,
}

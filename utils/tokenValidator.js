const jwt = require("jsonwebtoken")
const logger = require("./logger") // Assuming you have a logger

function validateToken(token, secret) {
  try {
    jwt.verify(token, secret)
    return { isValid: true }
  } catch (error) {
    logger.warn(`Invalid token attempt: ${error.message}`)
    return { isValid: false, error: error.message }
  }
}

module.exports = validateToken

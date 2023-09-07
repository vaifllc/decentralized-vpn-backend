// utils/errorHandler.js
const winston = require("winston") // Assume you've set up Winston elsewhere

function handleError(error, res, logger = winston) {
  // Log the error
  logger.error(`Error Message: ${error.message}`)
  logger.error(`Error Stack: ${error.stack}`)

  // Add more context if available
  if (res.req) {
    logger.error(
      `Error Context - Method: ${res.req.method}, URL: ${res.req.url}`
    )
  }

  // Customize error messages based on the type of error
  let statusCode = 500
  let clientMessage = "Server error"

  if (error.name === "ValidationError") {
    statusCode = 400
    clientMessage = "Validation failed"
  }

  // Extend this to handle more types of errors
  // ...

  return res.status(statusCode).json({ error: clientMessage })
}

module.exports = handleError

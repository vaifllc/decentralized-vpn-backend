const winston = require("winston") // Assume you've set up Winston elsewhere in your code

module.exports = (err, req, res, next) => {
  winston.error(err) // Log the error using Winston or your chosen logging library

  // Distinguish between types of errors
  if (err.name === "ValidationError") {
    return res.status(400).json({ error: "Validation Error", details: err })
  }

  if (err.name === "UnauthorizedError") {
    return res
      .status(401)
      .json({ error: "Unauthorized", details: "Invalid or missing token" })
  }

  // Generic error handling
  if (process.env.NODE_ENV === "development") {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: err })
  } else {
    return res.status(500).json({ error: "Internal Server Error" })
  }
}

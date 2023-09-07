const winston = require("winston") // Consider using a logging library

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  const user = req.auth
  if (!user) {
    const err = new Error("User not authenticated")
    err.status = 401
    winston.error("User not authenticated") // logging
    return next(err)
  }
  next()
}

// Middleware to check if user is an admin
const requireAdmin = [
  isAuthenticated,
  (req, res, next) => {
    const user = req.auth
    if (user.role !== "admin") {
      const err = new Error("User not authorized")
      err.status = 403
      winston.error("User not authorized") // logging
      return next(err)
    }
    next()
  },
]

// Middleware to check if user has a specific permission
const hasPermission = (permission) => [
  isAuthenticated,
  (req, res, next) => {
    const user = req.auth
    if (!user.permissions.includes(permission)) {
      const err = new Error("User not authorized")
      err.status = 403
      winston.error("User not authorized for permission:", permission) // logging
      return next(err)
    }
    next()
  },
]

module.exports = {
  isAuthenticated,
  requireAdmin,
  hasPermission,
}

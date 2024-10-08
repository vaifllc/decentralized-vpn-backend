const express = require("express")
const SessionController = require("../controllers/SessionController")
const { expressjwt: expressJwt } = require("express-jwt")
require("dotenv").config()
const User = require("../models/User")
const winston = require('winston'); // Make sure to install this package
const authenticateJWT = expressJwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth",
  resultProperty: "decoded",
  getToken: function fromHeaderOrCookie(req) {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      return req.headers.authorization.split(" ")[1]
    }
    return null
  },
}).unless({ path: ["/users/register", "/users/login"] })

const requireLogin = (req, res, next) => {
  try {
    authenticateJWT(req, res, async (err) => {
      if (err) {
        winston.error(`Authentication Error: ${err.message}`)
        return res.status(401).json({ message: err.message })
      }

      // Extract the userId from req.auth
      const userId = req.auth ? req.auth.userId : null

      if (!userId) {
        return res
          .status(401)
          .json({ message: "Invalid token or no token provided." })
      }

      // Find the user in the database using the custom userId
      const user = await User.findOne({ userId: userId })

      if (!user) {
        winston.warn(`Unauthorized access attempt by userId: ${userId}`)
        return res.status(401).json({ message: "The user does not exist." })
      }

      next()
    })
  } catch (error) {
    winston.error(`Internal Server Error: ${error.message}`)
    res.status(500).json({ message: "Internal Server Error" })
  }
}



const router = express.Router()

// Routes for session management
// Consolidated Routes for session management
router.post(
  "/create",
  authenticateJWT,
  requireLogin,
  SessionController.createSession
)
router.get("/", authenticateJWT, SessionController.getSessions)
router.post(
  "/revoke",
  authenticateJWT,
  requireLogin,
  SessionController.revokeSession
)
router.post(
  "/activity-logs/toggle",
  authenticateJWT,
  requireLogin,
  SessionController.toggleActivityLogs
)
router.post(
  "/auth-logs/toggle",
  authenticateJWT,
  requireLogin,
  SessionController.toggleAuthLogs
)
router.post(
  "/advanced-logs/toggle",
  authenticateJWT,
  requireLogin,
  SessionController.toggleAdvancedLogs
)



module.exports = router

const express = require("express")
const SessionController = require("../controllers/SessionController")
const { expressjwt: expressJwt } = require("express-jwt")
require("dotenv").config()
const User = require("../models/User")
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
        return res.status(401).json({ message: "The user does not exist." })
      }

      next()
    })
  } catch (error) {
    return res
      .status(500)
      .json({ message: "An internal server error occurred." })
  }
}


const router = express.Router()

// Routes for session management
router.post(
  "/create",
  authenticateJWT,
  requireLogin,
  SessionController.createSession
)
router.get("/", authenticateJWT, requireLogin, SessionController.getSessions)
router.post(
  "/revoke",
  authenticateJWT,
  requireLogin,
  SessionController.revokeSession
)

// Routes for session management
router.post(
  "/sessions/create",
  authenticateJWT,
  requireLogin,
  SessionController.createSession
)
router.get("/sessions/", authenticateJWT, requireLogin, SessionController.getSessions)
router.post(
  "/sessions/revoke",
  authenticateJWT,
  requireLogin,
  SessionController.revokeSession
)

// Routes for toggling logs
router.post(
  "/activity-logs/toggle",
  authenticateJWT,
  requireLogin,
  UserController.toggleActivityLogs
)
router.post(
  "/auth-logs/toggle",
  authenticateJWT,
  requireLogin,
  UserController.toggleAuthLogs
)
router.post(
  "/advanced-logs/toggle",
  authenticateJWT,
  requireLogin,
  UserController.toggleAdvancedLogs
)

module.exports = router

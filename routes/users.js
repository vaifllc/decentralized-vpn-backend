const express = require("express")
const ObjectID = require("mongodb").ObjectID
const router = express.Router()
require("dotenv").config()
const geoip = require("geoip-lite")
const User = require("../models/User")
const geolocationMiddleware = require("../middleware/geolocation")
const { checkToken } = require("../middleware/authMiddleware")
const { check, validationResult, oneOf } = require("express-validator")
const {
  register,
  login,
  getProfile,
  getAuthenticatedUser,
  updateProfile,
  setupMFA,
  verifyMFASetup,
  loginWithMFA,
  checkStatus,
  logout,
} = require("../controllers/userController")
const SessionController = require("../controllers/SessionController");
const { expressjwt: expressJwt } = require("express-jwt")
const rateLimit = require("express-rate-limit")
const jsonwebtoken = require("jsonwebtoken")

// Limit for login attempts
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5,
  message: "Too many login attempts, please try again later."
});

// General limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

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

router.use((req, res, next) => {
  if (req.decoded) {
    req.auth = { userId: req.decoded.userId }
  }
  next()
})

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

const checkBlacklistedToken = (req, res, next) => {
  console.log("Entering checkBlacklistedToken")
  const token = req.auth // Assuming 'requestProperty: "auth"' from jwt middleware

  // If token is in the blacklist, deny the request
  if (blacklistedTokens.some((blacklisted) => blacklisted.token === token)) {
    return res.status(401).json({ error: "Token is blacklisted" })
  }

  next()
}

// Error handling middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Register route
/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user using MetaMask
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ethAddress:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered successfully
 *       400:
 *         description: Bad request
 */
router.post("/register", register, apiLimiter)

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login a user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ethAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       400:
 *         description: Bad request
 */
// Login route
// Then in your routes
router.post(
  "/login",
  [
    oneOf(
      [
        check("email").isEmail().withMessage("Valid email is required"),
        check("password")
          .isLength({ min: 6 })
          .withMessage("Password should be at least 6 characters"),
      ],
      [
        check("ethAddress")
          .isLength({ min: 42, max: 42 })
          .withMessage("Valid Ethereum address is required"),
        check("signature").exists().withMessage("Signature is required"),
      ],
      {
        message:
          "Either email/password or ethAddress/signature must be provided.",
      }
    ),
  ],
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  login,
  loginLimiter,
  geolocationMiddleware,
  login // Your login controller function
)
router.post("/logout", logout)

// Fetch user profile
router.get("/profile", authenticateJWT, requireLogin, getProfile)

// Update user profile
// Then in your routes for updating the profile
router.put(
  "/profile",
  [
    oneOf(
      [
        check("email")
          .optional()
          .isEmail()
          .withMessage("Valid email is required"),
        check("password")
          .optional()
          .isLength({ min: 6 })
          .withMessage("Password should be at least 6 characters"),
        // Add more validations here for centralized auth
      ],
      [
        check("ethAddress")
          .optional()
          .isLength({ min: 42, max: 42 })
          .withMessage("Valid Ethereum address is required"),
        // Add more validations here for decentralized auth
      ],
      {
        message:
          "Either email/password or ethAddress fields must be provided for update.",
      }
    ),
  ],
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  updateProfile // Your updateProfile controller function
)

router.post("/setupMFA", requireLogin, setupMFA)

// Verify MFA setup for a user
router.post("/verifyMFASetup", requireLogin, verifyMFASetup)

// Login with MFA
router.post("/loginWithMFA", loginWithMFA)

router.get("/", function (req, res, next) {
  res.send("respond with a resource")
})

router.get("/status", checkStatus)

router.get("/details", authenticateJWT, requireLogin, getAuthenticatedUser)

// Route to create a new session
router.post("/sessions/create", authenticateJWT, requireLogin, SessionController.createSession);

// Route to get all active sessions
router.get("/sessions", authenticateJWT, requireLogin, SessionController.getSessions);

// Route to revoke a session
router.post("/sessions/revoke", authenticateJWT, requireLogin, SessionController.revokeSession);


module.exports = router

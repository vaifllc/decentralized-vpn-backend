const express = require("express")
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
const { expressjwt: expressJwt } = require("express-jwt")
const rateLimit = require("express-rate-limit")
const jsonwebtoken = require("jsonwebtoken")

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
})

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
      const token = req.headers.authorization.split(" ")[1]
      console.log("Token found in header:", token)
      return token
    }
    console.log("No token found")
    return null
  },
}).unless({ path: ["/users/register", "/users/login"] })

// Moved this to router.use()
router.use((req, res, next) => {
  if (req.decoded) {
    req.auth = { userId: req.decoded.userId }
    console.log("Decoded JWT:", req.decoded)
  }
  next()
})

const checkBlacklistedToken = (req, res, next) => {
  console.log("Entering checkBlacklistedToken")
  const token = req.auth // Assuming 'requestProperty: "auth"' from jwt middleware

  // If token is in the blacklist, deny the request
  if (blacklistedTokens.some((blacklisted) => blacklisted.token === token)) {
    return res.status(401).json({ error: "Token is blacklisted" })
  }

  next()
}

// Middleware for protected routes
const requireLogin = (req, res, next) => {
  try {
    console.log("Entering requireLogin")

    authenticateJWT(req, res, async (err) => {
      if (err) {
        console.log("Error in requireLogin:", err)
        const message =
          err.name === "UnauthorizedError"
            ? "Invalid token or no token provided."
            : err.message
        return res.status(401).json({ message })
      }

      console.log("Auth object:", req.auth)
      const userId = req.auth ? req.auth.userId : null
      console.log("UserId obtained from token:", userId)

      if (!userId) {
        console.log("No userId found in token")
        return res
          .status(401)
          .json({ message: "Invalid token or no token provided." })
      }

      // Change findById to findOne
      const user = await User.findOne({ userId: userId })

      if (!user) {
        console.log("User not found in the database:", userId)
        return res.status(401).json({ message: "The user does not exist." })
      }

      console.log("User found, proceeding to next middleware")
      next()
    })
  } catch (error) {
    console.error("Error in requireLogin:", error)
    return res
      .status(500)
      .json({ message: "An internal server error occurred." })
  }
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
  apiLimiter,
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

module.exports = router

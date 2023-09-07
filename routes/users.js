const express = require("express")
const router = express.Router()
const ObjectID = require("mongodb").ObjectID
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
  enableTwoFactor,
  validateTwoFactorToken,
  loginWithMFA,
  checkStatus,
  logout,
} = require("../controllers/userController")
const SessionController = require("../controllers/SessionController");
const { expressjwt: expressJwt } = require("express-jwt")
const rateLimit = require("express-rate-limit")
const jsonwebtoken = require("jsonwebtoken")
const redis = require("redis")
const client = redis.createClient()

const winston = require("winston")

// Redis Error Handling
client.on("error", function (error) {
  winston.error(`Redis error: ${error}`)
})

// DRY validation for email and password
const validateEmailAndPassword = [
  check("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  check("password")
    .isLength({ min: 6 })
    .withMessage("Password should be at least 6 characters")
    .trim()
    .escape()
];


// Centralized Error Handling
const errorHandler = (err, req, res, next) => {
  winston.error(`Error: ${err.message}`);
  res.status(500).send({ error: "An internal error occurred." });
};


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

const apiLimiter2 = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: (req) => {
    return req.tenantId === "some-special-tenant" ? 1000 : 100 // Different rate limits per tenant
  },
})

const requireTwoFA = async (req, res, next) => {
  const user = await User.findById(req.auth.userId)
  if (user && user.twoFAEnabled) {
    // Assume that the 2FA token is sent in the request header as 'x-2fa-token'
    const token = req.headers["x-2fa-token"]
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
    })
    if (!verified) {
      return res.status(401).json({ error: "Invalid 2FA token" })
    }
  }
  next()
}

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
  const token = req.auth // Assuming 'requestProperty: "auth"' from jwt middleware

  // Check if the token is in the Redis store
  client.exists(token, (err, reply) => {
    if (err) {
      return res.status(500).json({ error: "Internal Server Error" })
    }
    if (reply === 1) {
      return res.status(401).json({ error: "Token is blacklisted" })
    }
    next()
  })
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
router.post(
  "/register",
  [
    check("ethAddress")
      .isLength({ min: 42, max: 42 })
      .withMessage("Valid Ethereum address is required")
      .escape(), // Sanitize the input
    check("email")
      .isEmail()
      .withMessage("Valid email is required")
      .normalizeEmail(), // Sanitize the email
  ],
  (req, res, next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }
    next()
  },
  register,
  apiLimiter
)


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
// Apply DRY principle to /login route
router.post(
  "/login",
  [
    oneOf([
      ...validateEmailAndPassword,
      [
        check("ethAddress")
          .isLength({ min: 42, max: 42 })
          .withMessage("Valid Ethereum address is required")
          .trim()
          .escape(),
        check("signature")
          .exists()
          .withMessage("Signature is required")
          .trim()
          .escape()
      ]
    ])
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  login,
  loginLimiter,
  geolocationMiddleware,
);

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

// Endpoint for enabling 2FA
router.post("/enableTwoFactor", authenticateJWT, requireLogin, enableTwoFactor);

// Endpoint for validating 2FA Token
router.post("/validateTwoFactorToken", authenticateJWT, requireLogin, validateTwoFactorToken);


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

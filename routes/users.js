const express = require("express")
const router = express.Router()
require("dotenv").config()
const { check, validationResult } = require("express-validator") // Assuming you have express-validator installed
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
} = require("../controllers/userController") // Importing the new methods
const { expressjwt: jwt } = require("express-jwt")

const authenticateJWT = jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ["HS256"],
  requestProperty: "auth",
  getToken: function fromHeaderOrCookie(req) {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      return req.headers.authorization.split(" ")[1]
    }
    return null
  },
}).unless({
  // List of routes that don't require authentication
  path: ["/users/login", "/users/register"],
})

const checkBlacklistedToken = (req, res, next) => {
  const token = req.auth // Assuming 'requestProperty: "auth"' from jwt middleware

  // If token is in the blacklist, deny the request
  if (blacklistedTokens.some((blacklisted) => blacklisted.token === token)) {
    return res.status(401).json({ error: "Token is blacklisted" })
  }

  next()
}

// Middleware for protected routes
const requireLogin = (req, res, next) => {
authenticateJWT.unless().use((err, req, res, next) => {
  if (err.name === "UnauthorizedError") {
    res.status(401).json({ error: "Invalid Token" })
  }
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
  "/register",register
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
router.post("/login", login)
router.post("/logout", logout)

// Fetch user profile
router.get("/profile", requireLogin, getProfile) // This route should be protected

// Update user profile
router.put(
  "/profile",
  requireLogin,
  [
    check("email").isEmail().withMessage("Valid email is required"),
    handleValidationErrors,
  ],
  updateProfile
) // This route should be protected

router.post("/setupMFA", requireLogin, setupMFA)

// Verify MFA setup for a user
router.post("/verifyMFASetup", requireLogin, verifyMFASetup)

// Login with MFA
router.post("/loginWithMFA", loginWithMFA)

router.get("/", function (req, res, next) {
  res.send("respond with a resource")
})

router.get("/status", checkStatus)

router.get("/details", requireLogin, checkBlacklistedToken, getAuthenticatedUser)


module.exports = router

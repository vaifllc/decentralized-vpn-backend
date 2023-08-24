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
    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.split(" ")[0] === "Bearer"
    ) {
      return req.headers.authorization.split(" ")[1]
    }
    // Check for token in cookies (if you decide to use this approach)
    // else if (req.cookies && req.cookies.token) {
    //     return req.cookies.token;
    // }
    return null // Return null if no token found
  },
})

// Middleware for protected routes
const requireLogin = (req, res, next) => {
  authenticateJWT(req, res, async (err) => {
    if (err) {
      const message =
        err.name === "UnauthorizedError"
          ? "Invalid token or no token provided."
          : err.message
      return res.status(401).send({ message })
    }

    // Verify if user exists in database
    const userId = req.auth.id
    const user = await User.findById(userId)
    if (!user) {
      return res.status(401).send({ message: "The user does not exist." })
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

router.get("/details", requireLogin, getAuthenticatedUser)


module.exports = router

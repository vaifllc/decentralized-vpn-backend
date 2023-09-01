const bcrypt = require("bcryptjs")
const User = require("../models/User")
const { Web3 } = require("web3")
const jwt = require("jsonwebtoken")
const crypto = require("crypto")
const { validationResult } = require("express-validator")
const { v4: uuidv4 } = require("uuid")
const BlacklistedToken = require('../models/BlacklistedToken');  // Replace with the actual path to your model
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const logger = require("../utils/logger")
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://mainnet.infura.io/v3/a93b9b8a10b34f78ae358e5fbbdd81dc"
  )
)

const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
}

exports.register = async (req, res) => {
  const { email, password, ethAddress, signature } = req.body
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res
      .status(HTTP_STATUS_CODES.BAD_REQUEST)
      .json({ errors: errors.array() })
  }

  try {
    // Centralized registration
    if (email && password) {
      await centralizedRegistration(email, password, res)
    }
    // Decentralized registration
    else if (ethAddress && signature) {
      await decentralizedRegistration(ethAddress, signature, res)
    } else {
      return res
        .status(HTTP_STATUS_CODES.BAD_REQUEST)
        .json({ error: "Invalid registration data" })
    }
  } catch (error) {
    logger.error("Error during registration:", error)
    console.error("Error during registration:", error)
    return res
      .status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
      .json({ error: "Server error" })
  }
}

async function centralizedRegistration(email, password, res) {
  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res
        .status(HTTP_STATUS_CODES.BAD_REQUEST)
        .json({ error: "Email already registered" })
    }

    const hashedPassword = await bcrypt.hash(password, 10) // salt is generated and used internally
    const isMatch = await bcrypt.compare(password, hashedPassword)

    console.log("Immediate hash check:", isMatch) // This should log `true`

    // Create Stripe Customer
    const stripeCustomer = await stripe.customers.create({
      email,
      // Add any other Stripe Customer fields if needed
    })

    if (!stripeCustomer || stripeCustomer.error) {
      console.error("Error creating Stripe customer:", stripeCustomer.error)
      return res.status(500).json({ error: "Failed to create Stripe customer" })
    }

    const newUser = new User({
      userId: uuidv4(),
      email,
      password: hashedPassword,
      stripeCustomerId: stripeCustomer.id, // Store the Stripe Customer ID in your User model
    })

    await newUser.save()
    return res
      .status(HTTP_STATUS_CODES.CREATED)
      .json({ message: "User registered successfully (centralized)" })
  } catch (error) {
    logger.error("Error during registration:", error)
    console.error("Error during registration:", error)
    return res.status(500).json({ error: "Server error" })
  }
}


async function decentralizedRegistration(ethAddress, signature, res) {
  const existingUser = await User.findOne({ ethAddress })
  if (existingUser) {
    return res
      .status(HTTP_STATUS_CODES.BAD_REQUEST)
      .json({ error: "Ethereum address already registered" })
  }

  const nonce = crypto.randomBytes(16).toString("hex")

  // Create Stripe Customer
  // Note: Normally, you'd probably have the email from a decentralized system, but for this example, let's assume not.
  const stripeCustomer = await stripe.customers.create({
    description: `Customer for ethAddress: ${ethAddress}`,
    // Add any other Stripe Customer fields if needed
  })

  if (!stripeCustomer || stripeCustomer.error) {
    console.error("Error creating Stripe customer:", stripeCustomer.error)
    return res.status(500).json({ error: "Failed to create Stripe customer" })
  }

  // Here, you'd verify the signature using the ethAddress and nonce.
  // If valid, proceed with registration.
  // Note: Actual verification would involve using Ethereum libraries.

    const isSignatureValid = web3.eth.accounts.recover(signature) === ethAddress
    if (!isSignatureValid) {
      return res.status(401).json({ error: "Invalid Ethereum signature" })
    }

  const newUser = new User({
    userId: uuidv4(),
    ethAddress,
    nonce,
    stripeCustomerId: stripeCustomer.id, // Store the Stripe Customer ID in your User model
  })

  await newUser.save()
  return res
    .status(HTTP_STATUS_CODES.CREATED)
    .json({ message: "User registered successfully (decentralized)" })
}

exports.login = async (req, res) => {
  const { email, password, ethAddress, signature } = req.body

  console.log("Login request received:", req.body)

  try {
    if (email && password) {
      const user = await User.findOne({ email }).select("+password")

      if (!user) {
        console.log("No user found with email:", email)
        return res.status(400).json({ error: "Invalid credentials" })
      }

      console.log("User found:", user)

      const isMatch = await bcrypt.compare(user.password, password)
      console.log("Retrieved password hash length:", user.password.length)
      console.log(Buffer.from(user.password).toString("hex"))
      



      if (!isMatch) {
        console.log("Password mismatch for email:", email)
        return res.status(400).json({ error: "Invalid credentials" })
      }

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })
      return res.status(200).json({ message: "Logged in (centralized)", token })
    } else if (ethAddress && signature) {
      const user = await User.findOne({ ethAddress })

      if (!user) {
        console.log("No user found with Ethereum address:", ethAddress)
        return res.status(400).json({ error: "Login failed" })
      }

      console.log("User found with Ethereum address:", user)

      const recoveredAddress = web3.eth.accounts.recover(user.nonce, signature)

      if (recoveredAddress.toLowerCase() !== ethAddress.toLowerCase()) {
        console.log("Signature mismatch for Ethereum address:", ethAddress)
        return res.status(401).json({ error: "Invalid signature" })
      }

      user.nonce = crypto.randomBytes(16).toString("hex")

      // Common logic for both authentication types
      const newSession = {
        sessionId: crypto.randomBytes(16).toString("hex"),
        createdAt: new Date(),
        event: "Login",
        device: req.headers["user-agent"],
        ip: req.ip,
        // Populate these fields using a third-party geolocation API
        location: "",
        isp: "",
        appVersion: "", // Get this information from your client app
        isActive: true,
      }
          user.sessions.push(newSession)
          await user.save()

      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })
      return res
        .status(200)
        .json({ message: "Logged in (decentralized)", token })
    } else {
      console.log("Invalid login data:", req.body)
      return res.status(400).json({ error: "Invalid login data" })
    }
  } catch (error) {
    logger.error("Error during login:", error)
    console.error("Error during login:", error)
    return res.status(500).json({ error: "Server error" })
  }
}

// Each blacklisted token entry will have the format: { token: '...', userId: '...', expires: <timestamp> }
exports.logout = async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization
    if (!authorizationHeader) {
      return res.status(400).json({ error: "No authorization header provided" })
    }

    const token = authorizationHeader.split(" ")[1]
    if (!token) {
      return res.status(400).json({ error: "Invalid authorization format" })
    }

    const decodedToken = jwt.decode(token)
    if (!decodedToken || !decodedToken.userId) {
      return res.status(400).json({ error: "Invalid token" })
    }

    const newBlacklistedToken = new BlacklistedToken({
      token: token,
      userId: decodedToken.userId,
      expires: decodedToken.exp * 1000,
    })

    await newBlacklistedToken.save()
    console.log(`Token from user ${decodedToken.userId} added to blacklist`)

    return res.status(200).json({ message: "Successfully logged out" })
  } catch (error) {
    console.error("Error during logout:", error)
    return res.status(500).json({ error: "Server error" })
  }
}





exports.logoutAllDevices = async (req, res) => {
    try {
        const userId = req.user._id;  // Assuming you're storing user details in req.user

        // Add all tokens of this user to blacklist
        const userTokens = blacklistedTokens.filter(t => t.userId === userId);
        blacklistedTokens = [...blacklistedTokens, ...userTokens];

        console.log(`All tokens from user ${userId} added to blacklist`);

        return res.status(HTTP_STATUS_CODES.OK).json({ message: "Successfully logged out from all devices" });
    } catch (error) {
      logger.error("Error during logout from all devices:", error)
        console.error("Error during logout from all devices:", error);
        return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
    }
};

// Middleware to check if a token is blacklisted
exports.checkBlacklistedToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (blacklistedTokens.some(t => t.token === token)) {
        return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "This token has been blacklisted" });
    }
    next();
};


const speakeasy = require("speakeasy")
const QRCode = require("qrcode")

exports.setupMFA = async (req, res) => {
  const user = await User.findById(req.auth.id)

  const secret = speakeasy.generateSecret({
    length: 20,
    name: "VAIF R2",
    issuer: "VAIF CORP",
  })

  // Store this secret temporarily (not in the database yet)
  req.session.mfaSecret = secret.base32

  // Generate a QR code for the user to scan
  const dataURL = await QRCode.toDataURL(secret.otpauth_url)

  res.json({ qrCodeDataURL: dataURL })
}

exports.verifyMFASetup = async (req, res) => {
  const user = await User.findById(req.auth.id)
  const token = req.body.token

  const verified = speakeasy.totp.verify({
    secret: req.session.mfaSecret,
    encoding: "base32",
    token: token,
  })

  if (verified) {
    user.mfaSecret = req.session.mfaSecret
    await user.save()
    delete req.session.mfaSecret
    res.json({ success: true })
  } else {
    res.status(400).json({ success: false, message: "Invalid token" })
  }
}

exports.loginWithMFA = (req, res) => {
  const token = req.body.token
  const user = req.auth // Assuming you've authenticated the user already

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: "base32",
    token: token,
  })

  if (verified) {
    // Generate JWT or session and log the user in
  } else {
    res.status(400).json({ success: false, message: "Invalid MFA token" })
  }
}

exports.getProfile = async (req, res) => {
  try {
    // Return specific fields, excluding sensitive ones like passwords
    const user = await User.findById(req.auth.id).select("-password -__v")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(user)
  } catch (error) {
    logger.error("Error fetching user profile:", error)
    res.status(500).json({ error: "Error fetching user profile" })
  }
}

exports.updateProfile = async (req, res) => {
  try {
    // Define allowed update fields
    const allowedUpdates = ["email", "name", "address"]
    const attemptedUpdates = Object.keys(req.body)

    const isValidUpdate = attemptedUpdates.every((update) =>
      allowedUpdates.includes(update)
    )

    if (!isValidUpdate) {
      return res.status(400).json({ error: "Invalid updates!" })
    }

    const user = await User.findByIdAndUpdate(req.auth.id, req.body, {
      new: true,
      runValidators: true,
    })

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(user)
  } catch (error) {
    if (error.name === "ValidationError") {
      logger.error("ValidationError:", error)
      return res.status(400).json({ error: error.message })
    }
    logger.error("Error updating user profile:", error)
    res.status(500).json({ error: "Error updating user profile" })
  }
}

exports.updateUser = async (req, res) => {
  const userId = req.params.userId
  const updateData = req.body

  try {
    // Validate the input (you can add more validation based on your needs)
    if (!userId || typeof updateData !== "object") {
      return res.status(400).json({ error: "Invalid input data" })
    }

    // Find the user and update
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    // Check if user exists
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Log this update event (Assuming you have an EventLog model)
    const event = new EventLog({
      userId,
      eventType: "UserUpdate",
      details: `User with ID ${userId} updated.`,
      timestamp: new Date(),
    })
    await event.save()

    // Return the updated user
    return res.status(200).json({ message: "User updated successfully", user })
  } catch (error) {
    logger.error(`Error updating user: ${error}`)
    console.error(`Error updating user: ${error}`)

    // Log this error event
    const event = new EventLog({
      userId,
      eventType: "UserUpdateError",
      details: `Error updating user with ID ${userId}: ${error.message}`,
      timestamp: new Date(),
    })
    await event.save()

    return res.status(500).json({ error: "Server error" })
  }
}

async function updateUserService(userId, updateData) {
  try {
    // Validate the input
    if (!userId || typeof updateData !== "object") {
      throw new Error("Invalid input data")
    }

    // Find the user and update
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    )

    // Check if user exists
    if (!user) {
      throw new Error("User not found")
    }

    // Log this update event
    const event = new EventLog({
      userId,
      eventType: "UserUpdate",
      details: `User with ID ${userId} updated.`,
      timestamp: new Date(),
    })
    await event.save()

    return user
  } catch (error) {
    console.error(`Error updating user: ${error}`)

    // Log this error event
    const event = new EventLog({
      userId,
      eventType: "UserUpdateError",
      details: `Error updating user with ID ${userId}: ${error.message}`,
      timestamp: new Date(),
    })
    await event.save()

    throw error
  }
}


exports.checkStatus = async (req, res) => {
  // Extract the JWT token from the request headers
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      isAuthenticated: false,
      message: "No token provided.",
    })
  }

  try {
    // Verify the token
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)

    // Extract the userId from the decoded token
    const userId = decodedToken.userId

    // Attempt to find the user in the database
    const user = await User.findById(userId)

    // If the user does not exist in the database, the user is not authenticated
    if (!user) {
      return res.status(401).json({
        isAuthenticated: false,
        message: "User not found in the database.",
      })
    }

    // If user is found, return their authentication status and role
    return res.status(200).json({
      isAuthenticated: true,
      role: user.role,
      message: "User is authenticated.",
    })
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({
        isAuthenticated: false,
        message: "Invalid or expired token.",
      })
    }

    // Handle unexpected errors
    return res.status(500).json({
      isAuthenticated: false,
      message: "Server error. Please try again later.",
      error: err.message,
    })
  }
}

exports.getAuthenticatedUser = async (req, res) => {
  console.log("Backend Headers:", req.headers) // Log the headers

  // Check if the user ID is available in the request
  if (!req.user || !req.user.id) {
    return res
      .status(401)
      .json({ message: "Unauthorized. No user ID found in token." })
  }

  try {
    const userId = req.user.id // Get user ID from the decoded JWT token
    const user = await User.findById(userId).select("-password") // Fetch user without password field

    // Check if the user exists
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json(user)
  } catch (error) {
    logger.error("Error fetching user:", error)
    console.error("Error fetching user:", error)
    res.status(500).send("Server Error")
  }
}




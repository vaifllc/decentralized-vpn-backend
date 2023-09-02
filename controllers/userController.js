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
require("dotenv").config()
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

const createToken = (user) => {
  const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRY || "1h",
  })
  return token
}

const sendResponse = (res, message, token, userId) => {
  console.log("userId before sending:", userId) // Debugging log
  const responseObject = { message, token, user: { role: "user", userId } }
  console.log("Sending back response:", JSON.stringify(responseObject, null, 2))
  return res.status(200).json(responseObject)
}




// Helper function to create a security log
const createSecurityLog = async (user, event, req, advancedLogEnabled) => {
  const newLog = {
    time: new Date(),
    event,
    appVersion: req.headers['app-version'] || '',
    ip: req.ip,
  };

  if (advancedLogEnabled) {
    newLog.location = req.headers['geo-location'] || '';
    newLog.isp = req.headers['isp'] || '';
    newLog.device = req.headers['user-agent'] || '';
    newLog.protection = req.headers['vpn-protection'] === 'true';
  }

  user.securityLogs.push(newLog);
  await user.save();
};

// Fetch all security logs for a user
exports.getSecurityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json(user.securityLogs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// Update the log settings
exports.updateLogSettings = async (req, res) => {
  try {
    const { userId, enableAuthLogs, enableAdvancedLogs } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.logSettings = { enableAuthLogs, enableAdvancedLogs };
    await user.save();

    return res.status(200).json(user.logSettings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


exports.login = async (req, res) => {
  console.log("Request body:", req.body) // Log the request body
  const { email, password, ethAddress, signature } = req.body

  try {
    if (email && password) {
      console.log("Attempting centralized login")
      const user = await User.findOne({ email }).select("+password")

      // Log to check if the user object is fetched correctly
      console.log("Fetched user:", JSON.stringify(user))

      if (!user) {
        console.log("No user found with email:", email)
        return res.status(400).json({ error: "Invalid credentials" })
      }

      // Log to check the hashed and plain passwords
      console.log("Hashed password from DB: ", user.password)
      console.log("Plain password from request: ", password)

      const isMatch = await bcrypt.compare(password, user.password)
      console.log("Is password match:", isMatch)

      if (!isMatch) {
        console.log("Password mismatch for email:", email)
        return res.status(400).json({ error: "Invalid credentials" })
      }

      // More logs
      console.log("Password matched, proceeding...")

      // Adding session management for centralized login
      const newSession = {
        sessionId: crypto.randomBytes(16).toString("hex"),
        date: new Date(),
        action: "Login",
        app: req.headers["app-name"] || "",
      }

      console.log("Adding new session:", newSession)
      user.sessions.push(newSession)
      await createSecurityLog(
        user,
        "Login",
        req,
        user.logSettings.enableAdvancedLogs
      )

      try {
        await user.save()
        console.log("User successfully saved.")
      } catch (error) {
        console.error("An error occurred while saving the user:", error)
      }

      const token = createToken(user)
      return sendResponse(res, "Logged in (centralized)", token, user.userId)
    }
    // The rest of your code remains unchanged
  } catch (error) {
    console.error("An unexpected error occurred:", error)
    return res.status(500).json({ error: "Server error" })
  }
}




// Each blacklisted token entry will have the format: { token: '...', userId: '...', expires: <timestamp> }
exports.logout = async (req, res) => {
  try {
    const authorizationHeader = req.headers.authorization
    if (!authorizationHeader) {
      return res
        .status(401)
        .json({ error: "Unauthorized: No authorization header provided" })
    }

    const token = authorizationHeader.split(" ")[1]
    if (!token) {
      return res
        .status(400)
        .json({ error: "Bad Request: Invalid authorization format" })
    }

    const decodedToken = jwt.decode(token, process.env.JWT_SECRET)
    if (!decodedToken || !decodedToken.userId) {
      return res.status(403).json({ error: "Forbidden: Invalid token" })
    }

    console.log("Decoded Token:", decodedToken) // Additional log

    // Check if the token already exists in the blacklistedtokens collection
    const existingToken = await BlacklistedToken.findOne({ token: token })
    if (!existingToken) {
      const newBlacklistedToken = new BlacklistedToken({
        token: token,
        userId: decodedToken.userId, // Ensure it's a string
        expires: decodedToken.exp * 1000, // Add TTL here if your DB supports it
      })

      await newBlacklistedToken.save()
      console.log(`Token from user ${decodedToken.userId} added to blacklist`)
    }

    // Retrieve the user based on the userId in the decoded token
    const user = await User.findOne({ userId: decodedToken.userId })
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (
      user &&
      user.logSettings &&
      typeof user.logSettings.enableAdvancedLogs !== "undefined"
    ) {
      await createSecurityLog(
        user,
        "Logout",
        req,
        user.logSettings.enableAdvancedLogs
      )
    }

    return res.status(200).json({ message: "Successfully logged out" })
  } catch (error) {
    console.error("Error during logout:", error)
    return res.status(500).json({ error: "Internal Server Error" })
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
    const userId = decodedToken.userId // using userId

    // Attempt to find the user in the database
    const user = await User.findOne({ userId: userId }) // use findOne and search by userId

    // If the user does not exist in the database, the user is not authenticated
    if (!user) {
      return res.status(401).json({
        isAuthenticated: false,
        message: "User not found in the database.",
      })
    }

    // If the user is found, return their authentication status and role
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
  // Log the headers for debugging
  console.log("Backend Headers:", req.headers)

  // Log the auth object if available (should be populated by your authentication middleware)
  console.log("Backend Auth Object:", req.auth) // Changed from req.user to req.auth

  // Check if the user ID is available in the request
  if (!req.auth || !req.auth.userId) {
    // Changed from req.user.id to req.auth.userId
    console.log("Unauthorized access. Missing user ID in token.")
    return res
      .status(401)
      .json({ message: "Unauthorized. No user ID found in token." })
  }

  try {
    const userId = req.auth.userId // Get user ID from req.auth object
    console.log("Fetching details for User ID:", userId)

    // Use findOne to find the user by userId
    const user = await User.findOne({ userId: userId }).select("-password") // Use userId

    // Check if the user exists
    if (!user) {
      console.log(`User with ID ${userId} not found.`)
      return res.status(404).json({ message: "User not found" })
    }

    console.log("Fetched User:", user)
    res.json(user)
  } catch (error) {
    console.error("Error fetching user:", error)
    res.status(500).send("Server Error")
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







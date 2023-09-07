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
const schedule = require("node-schedule")
require("dotenv").config()
const { abi } = require('../TrialManager.json'); // Import ABI from your compiled contract JSON
const web3 = new Web3(
  new Web3.providers.HttpProvider(
    "https://goerli.infura.io/v3/a93b9b8a10b34f78ae358e5fbbdd81dc"
  )
)
const contractAddress = process.env.CONTRACT_ADDRESS

// Create contract object
const trialManagerContract = new web3.eth.Contract(abi, contractAddress)
const client = require("../config/redisClient"); // Replace with your actual path
const handleError = require("../utils/errorHandler.js")
const validateToken = require("../utils/tokenValidator")
const logAccountActivity = require("../utils/accountActivityLogger")

// ... Previous Imports ...

const HTTP_STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
};



exports.register = async (req, res) => {
  try {
    const { email, password, ethAddress, signature } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ errors: errors.array() });
    }

    if (email && password) {
      await centralizedRegistration(req, res, email, password);
    } else if (ethAddress && signature) {
      await decentralizedRegistration(req, res, ethAddress, signature);
    } else {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "Invalid registration data" });
    }
  } catch (error) {
    logger.error("Error during registration:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Server error" });
  }
};

async function centralizedRegistration(req, res, email, password) {
  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res
        .status(HTTP_STATUS_CODES.BAD_REQUEST)
        .json({ error: "Email already registered" })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const stripeCustomer = await stripe.customers.create({ email })
    if (!stripeCustomer || stripeCustomer.error) {
      return res
        .status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
        .json({ error: "Failed to create Stripe customer" })
    }

    const trialEnd = new Date()
    trialEnd.setDate(trialEnd.getDate() + 3) // 3 days from now

    const newUser = new User({
      userId: uuidv4(),
      email,
      password: hashedPassword,
      stripeCustomerId: stripeCustomer.id,
      trialStart: new Date(),
      trialEnd: trialEnd,
    })

    const accountActivity = {
      activityType: "Registration",
      activityTime: new Date(),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
    }

    newUser.accountActivities.push(accountActivity)
    await user.save() // Add this line
    await newUser.save()

    return res
      .status(HTTP_STATUS_CODES.CREATED)
      .json({ message: "User registered successfully (centralized)" })
  } catch (error) {
    logger.error("Error during centralized registration:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Server error during centralized registration" });
  }
}

async function decentralizedRegistration(req, res, ethAddress, signature) {
  try {
    const existingUser = await User.findOne({ ethAddress });
    if (existingUser) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "Ethereum address already registered" });
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const isSignatureValid = web3.eth.accounts.recover(signature) === ethAddress;

    if (!isSignatureValid) {
      return res.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "Invalid Ethereum signature" });
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 3); // 3 days from now

    const newUser = new User({
      userId: uuidv4(),
      ethAddress,
      nonce,
      trialStart: new Date(),
      trialEnd: trialEnd,
    });

    const accountActivity = {
      activityType: "Registration",
      activityTime: new Date(),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
    };

    newUser.accountActivities.push(accountActivity);
    await newUser.save();

    return res.status(HTTP_STATUS_CODES.CREATED).json({ message: "User registered successfully (decentralized)" });
  } catch (error) {
    logger.error("Error during decentralized registration:", error);
    return res.status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR).json({ error: "Server error during decentralized registration" });
  }
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
  const { email, password, ethAddress, signature } = req.body

  try {
    if (email && password) {
      const user = await User.findOne({ email }).select("+password")
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" })
      }

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" })
      }

      const newSession = {
        sessionId: crypto.randomBytes(16).toString("hex"),
        date: new Date(),
        action: "Login",
        app: req.headers["x-app-type"] || "Unknown App",
      }

      user.sessions.push(newSession)
      await createSecurityLog(
        user,
        "Login",
        req,
        user.logSettings.enableAdvancedLogs
      )

      // const accountActivity = {
      //   activityType: "Login",
      //   activityTime: new Date(),
      //   deviceInfo: req.headers["user-agent"],
      //   ipAddress: req.ip,
      // }

      logAccountActivity(user, "Login", req)

      user.accountActivities.push(accountActivity)
      await user.save()
      const token = createToken(user)
      return sendResponse(res, "Logged in (centralized)", token, user.userId)
    }
  } catch (error) {
    return res.status(500).json({ error: "Server error" })
  }
}

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

    const user = await User.findOne({ userId: decodedToken.userId })
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const accountActivity = {
      activityType: "Logout",
      activityTime: new Date(),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
    }

    user.accountActivities.push(accountActivity)
    await user.save()
    return res.status(200).json({ message: "Successfully logged out" })
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.checkStatus = async (req, res) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      isAuthenticated: false,
      message: "No token provided.",
    })
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    const userId = decodedToken.userId
    const user = await User.findOne({ userId: userId })
    if (!user) {
      return res.status(401).json({
        isAuthenticated: false,
        message: "User not found in the database.",
      })
    }

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

    return res.status(500).json({
      isAuthenticated: false,
      message: "Server error. Please try again later.",
      error: err.message,
    })
  }
}

// Generate and store the password reset token and send an email
exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Generate a reset token and expiry
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    
    // Send the reset token via email (implement this function)
    await sendResetEmail(email, resetToken);
    
    return res.status(200).json({ message: "Reset token sent" });
  } catch (error) {
    console.error("Error during password reset request:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// Validate the token and reset the password
exports.resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    const user = await User.findOne({ resetToken, resetTokenExpiry: { $gte: Date.now() } });
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    
    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


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

exports.enableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }
    const secret = speakeasy.generateSecret({ length: 20 })
QRCode.toDataURL(secret.otpauth_url, async (err, dataURL) => {
  if (err) {
    console.error("Error generating QR Code:", err)
    return res
      .status(500)
      .json({ error: "Internal Server Error: Unable to generate QR code" })
  }

  user.twoFASecret = secret.base32
  user.twoFAEnabled = true
  await user.save()

  // Send the data URL for QR code to the client
  res.json({ qrCodeDataURL: dataURL })
})

  } catch (error) {
    console.error("Error enabling 2FA:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}


// Validate 2FA token
exports.validateTwoFactorToken = async (req, res) => {
  try {
    const { token } = req.body
    const user = await User.findById(req.userId)
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: "base32",
      token,
    })
    if (verified) {
      res.json({ valid: true })
    } else {
      res.json({ valid: false })
    }
  } catch (error) {
    console.error("Error during 2FA validation:", error)
    return res.status(500).json({ error: "Internal Server Error" })
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
    const { userId } = req.auth
    const { email, password } = req.body

    const user = await User.findOne({ userId })
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    if (email) {
      user.email = email
    }

    if (password) {
      user.password = await bcrypt.hash(password, 10)
    }

    const accountActivity = {
      activityType: "Profile Updated",
      activityTime: new Date(),
      deviceInfo: req.headers["user-agent"],
      ipAddress: req.ip,
    }

    user.accountActivities.push(accountActivity)
    await user.save()

    return res.status(200).json({ message: "Profile updated successfully" })
  } catch (error) {
    console.error("Error updating profile:", error)
    return res.status(500).json({ error: "Internal Server Error" })
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

// This will run every day at midnight
const job = schedule.scheduleJob('0 0 * * *', async function() {
  
  // Check centralized trials
  const centralizedUsers = await User.find({ isCentralized: true });
  
  centralizedUsers.forEach(async (user) => {
    if (new Date(user.trialEnd) < new Date()) {
      // Deactivate user trial
      user.trialActive = false;
      await user.save();
      // Additional logic when a centralized trial ends
      console.log(`Trial ended for centralized user: ${user.email}`);
    }
  });

  // Check decentralized trials
  const decentralizedUsers = await User.find({ isCentralized: false });

  decentralizedUsers.forEach(async (user) => {
    const trialStatus = await contract.methods.checkTrial(user.ethAddress).call();
    
    if (!trialStatus) {
      // Deactivate user trial
      user.trialActive = false;
      await user.save();
      // Additional logic when a decentralized trial ends
      console.log(`Trial ended for decentralized user: ${user.ethAddress}`);
    }
  });
});







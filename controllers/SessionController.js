const Session = require("../models/Session")
const User = require('../models/User');  // Assuming you have a User model
const redis = require("redis")
const redisClient = require('../config/redisClient');  // Import the Redis client
const SESSION_EXPIRY_DAYS = 7;  // Sessions expire after 7 days
const nodemailer = require("nodemailer")
const twilio = require("twilio")
// Initialize Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const client = twilio(accountSid, authToken)
const util = require("util")
console.log("Redis Client:", redisClient)
console.log("Is setex available?", typeof redisClient.setex === "function")

const redisSetAsync = util.promisify(redisClient.setEx).bind(redisClient)
const CustomError = require('../utils/CustomError'); // Assuming you have a CustomError.js file containing the class
// Session Management Controller

// Initialize nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});




exports.initiate2FA = async (req, res) => {
  try {
    const { userId } = req.body

    // Input Validation
    if (!userId || typeof userId !== "string") {
      throw new CustomError("Invalid user ID", 400)
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError("User not found", 404)
    }

    // Generate OTP (One-Time Password)
    const otp = Math.floor(100000 + Math.random() * 900000) // 6 digit number

    // Store the OTP in Redis with a 5-minute expiration
    await redisSetAsync(`otp_${userId}`, 300, otp)

    // Send the OTP via email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: user.email,
      subject: "Your OTP Code",
      text: `Your OTP code is ${otp}`,
    }

    // Assuming transporter.sendMail returns a Promise
    await transporter.sendMail(mailOptions)

    // Send the OTP via SMS
    await client.messages.create({
      body: `Your OTP code is ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: user.phoneNumber,
    })

    return res
      .status(200)
      .json({ message: "2FA initiated, OTP sent via both email and SMS." })
  } catch (error) {
    console.error("Error initiating 2FA:", error)
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Internal Server Error" })
  }
}

exports.createSession = async (req, res) => {
  try {
    const { userId, app } = req.body

    // Input Validation
    if (!userId || typeof userId !== "string") {
      throw new CustomError("Invalid user ID", 400)
    }

    const user = await User.findById(userId)
    if (!user) {
      throw new CustomError("User not found", 404)
    }

    const newSession = {
      userId: user._id,
      app,
      date: new Date(),
      expires: new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000), // Expiry date
      action: "Current Session",
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    }

    user.sessions.push(newSession)
    await user.save()

    return res.status(201).json(newSession)
  } catch (error) {
    console.error("Error creating session:", error)
    return res
      .status(error.status || 500)
      .json({ error: error.message || "Internal Server Error" })
  }
}
exports.getSessions = async (req, res) => {
  try {
    const userId = req.auth ? req.auth.userId : null
    const user = await User.findOne({ userId: userId }).select("sessions")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    const activeSessions = user.sessions.filter(
      (session) => new Date(session.expires) > new Date()
    )

    return res.status(200).json(activeSessions)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.revokeSession = async (req, res) => {
  try {
    const sessionId = req.body.sessionId
    const userId = req.auth.userId // Extract userId from the JWT token

    // Fetch the associated userId from Redis
    const sessionUserId = await redisClient.get(sessionId)

    // Check if the session exists and belongs to the current user
    if (!sessionUserId || sessionUserId !== userId) {
      return res
        .status(404)
        .json({ message: "Session not found or unauthorized" })
    }

    // Delete the session from Redis
    await redisClient.del(sessionId)

    res.status(200).json({ message: "Session revoked successfully" })
  } catch (error) {
    console.error("Error revoking session:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.toggleActivityLogs = async (req, res) => {
  try {
    const userId = req.auth.userId // Assuming user ID is available in request
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Toggle the activity logs setting
    user.logSettings.enableActivityLogs = !user.logSettings.enableActivityLogs
    await user.save()

    res.status(200).json({ isEnabled: user.logSettings.enableActivityLogs })
  } catch (error) {
    console.error("Error toggling activity logs:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.toggleAuthLogs = async (req, res) => {
  try {
    const userId = req.auth.userId // Assuming user ID is available in request
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Toggle the auth logs setting
    user.logSettings.enableAuthLogs = !user.logSettings.enableAuthLogs
    await user.save()

    res.status(200).json({ isEnabled: user.logSettings.enableAuthLogs })
  } catch (error) {
    console.error("Error toggling auth logs:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.toggleAdvancedLogs = async (req, res) => {
  try {
    const userId = req.auth.userId
    const user = await User.findById(userId)

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Toggle the advanced logs setting
    user.logSettings.enableAdvancedLogs = !user.logSettings.enableAdvancedLogs
    await user.save()

    res.status(200).json({ isEnabled: user.logSettings.enableAdvancedLogs })
  } catch (error) {
    console.error("Error toggling advanced logs:", error)
    res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.verify2FA = async (req, res) => {
  try {
    const { userId, otp } = req.body

    // Fetch the stored OTP from Redis
    const storedOtp = await redisClient.get(`otp_${userId}`)

    if (!storedOtp) {
      return res
        .status(400)
        .json({ error: "OTP has expired or does not exist" })
    }

    if (storedOtp !== otp.toString()) {
      return res.status(400).json({ error: "Invalid OTP" })
    }

    // OTP is valid, remove it from Redis
    await redisClient.del(`otp_${userId}`)

    // Fetch the user from the database
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Create a new session for the user
    const newSession = {
      sessionId: crypto.randomBytes(16).toString("hex"),
      date: new Date(),
      action: "2FA verified",
      app: req.headers["x-app-type"] || "Unknown App",
    }
    user.sessions.push(newSession)
    await user.save()

    // Generate a new JWT token for the user
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    })

    return res
      .status(200)
      .json({ message: "2FA verification successful", token })
  } catch (error) {
    console.error("Error verifying 2FA:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}





// Add more methods as needed

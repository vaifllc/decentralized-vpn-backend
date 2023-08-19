const bcrypt = require("bcryptjs")
const User = require("../models/User")
const Web3 = require('web3');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const web3 = new Web3(
  "https://mainnet.infura.io/v3/a93b9b8a10b34f78ae358e5fbbdd81dc"
)
 // You can also set a provider if required

exports.register = async (req, res) => {
  const { email, password, ethAddress, signature } = req.body
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() })
      }
  try {
    if (email && password) {
      // Check if email already exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" })
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      const newUser = new User({
        email,
        password: hashedPassword,
      })

      await newUser.save()
      res
        .status(201)
        .json({ message: "User registered successfully (centralized)" })
    } else if (ethAddress && signature) {
      // Check if ethAddress already exists
      const existingUser = await User.findOne({ ethAddress })
      if (existingUser) {
        return res
          .status(400)
          .json({ error: "Ethereum address already registered" })
      }

      // Generate a nonce
      const nonce = crypto.randomBytes(16).toString("hex")

      // Here, you'd verify the signature using the ethAddress and nonce.
      // If valid, proceed with registration.
      // Note: Actual verification would involve using Ethereum libraries.

      const newUser = new User({
        ethAddress,
        nonce,
      })

      await newUser.save()
      res
        .status(201)
        .json({ message: "User registered successfully (decentralized)" })
    } else {
      res.status(400).json({ error: "Invalid registration data" })
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
}

exports.login = async (req, res) => {
  const { email, password, ethAddress, signature } = req.body

  try {
    if (email && password) {
      const user = await User.findOne({ email })
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" })
      }

      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" })
      }

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })
      res.status(200).json({ message: "Logged in (centralized)", token })
    } else if (ethAddress && signature) {
      const user = await User.findOne({ ethAddress })
      if (!user) {
        return res.status(400).json({ error: "Login failed" })
      }

      // Get the Ethereum address from the signature
      const recoveredAddress = web3.eth.accounts.recover(user.nonce, signature)

      // Compare the recovered address with the stored ethAddress
      if (recoveredAddress.toLowerCase() !== ethAddress.toLowerCase()) {
        return res.status(401).json({ error: "Invalid signature" })
      }

      // Invalidate or update the nonce
      user.nonce = crypto.randomBytes(16).toString("hex")
      await user.save()

      // Generate JWT
      const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      })
      res.status(200).json({ message: "Logged in (decentralized)", token })
    } else {
      res.status(400).json({ error: "Invalid login data" })
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" })
  }
}


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
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: "Error updating user profile" })
  }
}



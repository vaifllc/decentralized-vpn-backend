const geoip = require("geoip-lite")
const User = require("../models/User") // Import your User model
const { v4: uuidv4 } = require('uuid'); // For generating unique session IDs

const geolocationMiddleware = async (req, res, next) => {
  // Assume that req.user is populated and contains the user ID
  if (!req.user || !req.user._id) {
    return next()
  }

  const ip = req.ip // Capture the IP from the request
  const geo = geoip.lookup(ip) // Lookup geolocation for the IP

  // If geolocation is found, update the session
  if (geo) {
    const location = `${geo.city}, ${geo.country}`
    const newSession = {
      sessionId: uuidv4(), // Generate a unique session ID
      createdAt: new Date(),
      event: "Login",
      device: req.headers["user-agent"], // Capture device info from the User-Agent header
      ip,
      location,
      // ... any other session fields you may have, like 'isp', 'appVersion', etc.
    }

    // Update user document
    try {
      await User.findByIdAndUpdate(
        req.user._id,
        { $push: { sessions: newSession } },
        { new: true, upsert: true }
      )
    } catch (error) {
      console.error(`Error updating user session: ${error}`)
      // You may also want to log this error in your logging system
    }
  }

  next()
}

module.exports = geolocationMiddleware

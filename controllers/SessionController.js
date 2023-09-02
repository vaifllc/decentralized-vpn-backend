const Session = require("../models/Session")
const User = require('../models/User');  // Assuming you have a User model

// Session Management Controller

exports.createSession = async (req, res) => {
  try {
    const { userId, app } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const newSession = {
      userId: user._id,
      app,
      date: new Date(),
      action: "Current Session", // Default action when a session is created
    };

    user.sessions.push(newSession);

    await user.save();

    return res.status(201).json(newSession);
  } catch (error) {
    console.error("Error creating session:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId).select("sessions")

    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    console.log("Sending sessions:", user.sessions) // Debugging line
    return res.status(200).json(user.sessions)
  } catch (error) {
    console.error("Error fetching sessions:", error)
    return res.status(500).json({ error: "Internal Server Error" })
  }
}

exports.revokeSession = async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const session = user.sessions.id(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    session.action = "Revoked";

    await user.save();

    return res.status(200).json(session);
  } catch (error) {
    console.error("Error revoking session:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

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



// Add more methods as needed

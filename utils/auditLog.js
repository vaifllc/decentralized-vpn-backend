const Audit = require("../models/Audit")

exports.log = async (user, action, details) => {
  const entry = new Audit({
    user,
    action,
    details,
  })

  try {
    await entry.save()
  } catch (error) {
    console.error("Failed to save audit log:", error)
    // Optionally, you might want to notify an admin or trigger some other action
  }
}

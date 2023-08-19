const Audit = require("../models/Audit")

exports.log = async (user, action, details) => {
  const entry = new Audit({
    user,
    action,
    details,
  })

  await entry.save()
}

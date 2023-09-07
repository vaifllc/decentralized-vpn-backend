const ip = require("ip") // You may need to install this package

const validateServer = (req, res, next) => {
  const { name, type, ipAddress, country, city, port, configFile } = req.body

  // Check for missing fields
  if (
    !name ||
    !type ||
    !ipAddress ||
    !country ||
    !city ||
    !port ||
    !configFile
  ) {
    return res.status(400).json({ error: "All fields are required." })
  }

  // Validate IP address format
  if (!ip.isV4Format(ipAddress)) {
    return res.status(400).json({ error: "Invalid IP address format." })
  }

  next()
}

module.exports = {
  validateServer,
}

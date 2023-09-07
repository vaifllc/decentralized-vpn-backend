const winston = require("winston")
const Server = require("../models/Server") // Replace with your model
const OpenVPN = require("../OpenVPN.js") // Replace with your OpenVPN logic

const MAX_RETRIES = 3

const run = async () => {
  try {
    const openvpnServers = await Server.find({ type: "openvpn" })

    for (const server of openvpnServers) {
      let retries = 0
      let isHealthy = false

      // Implementing retry logic
      while (retries < MAX_RETRIES) {
        isHealthy = await OpenVPN.checkServerHealth(server)
        if (isHealthy) break
        retries++
      }

      if (!isHealthy) {
        await OpenVPN.handleError(server)
        // Optionally, add a notification logic here
      }
    }
  } catch (error) {
    winston.error("Failed to perform health check:", error)
  }
}

module.exports = {
  run,
}

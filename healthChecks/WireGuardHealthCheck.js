const axios = require("axios")

class WireGuardHealthCheck {
  async checkServerHealth(server) {
    try {
      const startTime = Date.now()

      // Check the basic health endpoint
      const response = await axios.get(
        `http://${server.ipAddress}:port/wireguard/health`
      )

      const responseTime = Date.now() - startTime

      // Check for OK status
      if (response.status !== 200) {
        return false
      }

      // Check for fast response time
      if (responseTime > 2000) {
        // 2 seconds
        return false
      }

      // Check for expected content (optional)
      if (response.data && response.data.status !== "ok") {
        return false
      }

      // Additional checks can be added here based on your needs

      return true
    } catch (error) {
      console.error("Health check failed:", error)
      return false
    }
  }
}

module.exports = new WireGuardHealthCheck()

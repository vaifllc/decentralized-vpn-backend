const axios = require("axios")

class OpenVPNHealthCheck {
  async checkServerHealth(server) {
    try {
      const startTime = Date.now()

      // Make a request to the OpenVPN health endpoint
      const response = await axios.get(`http://${server.ipAddress}:port/health`)

      const responseTime = Date.now() - startTime

      // Check for OK status
      if (response.status !== 200) {
        console.error(`Health check failed: received ${response.status} status`)
        return "unhealthy"
      }

      // Check for fast response time
      if (responseTime > 2000) {
        // 2 seconds
        console.error("Health check failed: response time too slow")
        return "unhealthy"
      }

      // Optionally, check the content of the response
      if (response.data && response.data.status !== "ok") {
        console.error(
          `Health check failed: unexpected response content ${response.data}`
        )
        return "unhealthy"
      }

      // Additional checks can be added here

      return "healthy"
    } catch (error) {
      console.error("Health check failed:", error)
      return "unhealthy"
    }
  }
}

module.exports = new OpenVPNHealthCheck()

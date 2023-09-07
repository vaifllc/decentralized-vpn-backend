const axios = require("axios")

class NodeHealthCheck {
  async checkNodeHealth(node) {
    try {
      const startTime = Date.now()

      // Make a request to the node's health endpoint
      const response = await axios.get(
        `http://${node.ipAddress}:port/node/health`
      )

      const responseTime = Date.now() - startTime

      // Check for OK status
      if (response.status !== 200) {
        console.error(`Health check failed: received ${response.status} status`)
        return false
      }

      // Check for fast response time
      if (responseTime > 2000) {
        // 2 seconds
        console.error("Health check failed: response time too slow")
        return false
      }

      // Optionally, check the content of the response
      if (response.data && response.data.status !== "ok") {
        console.error(
          `Health check failed: unexpected response content ${response.data}`
        )
        return false
      }

      // Additional checks can be added here

      return true
    } catch (error) {
      console.error("Health check failed:", error)
      return false
    }
  }
}

module.exports = new NodeHealthCheck()

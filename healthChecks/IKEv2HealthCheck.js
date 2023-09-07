const axios = require("axios") // Assuming you're using Axios for HTTP requests

class IKEv2HealthCheck {
  async checkServerHealth(server) {
    try {
      // Implement your health check logic here for IKEv2
      const response = await axios.get(
        `http://${server.ipAddress}:port/ikev2/health`
      )
      if (response.status === 200) {
        return true
      } else {
        return false
      }
    } catch (error) {
      return false
    }
  }
}

module.exports = new IKEv2HealthCheck()

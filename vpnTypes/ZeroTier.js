const axios = require("axios")
const Server = require("../models/Server") // Assuming Server model is in this path

// ZeroTier Central API base URL and API token
const ZT_API_BASE_URL = "https://my.zerotier.com/api"
const ZT_API_TOKEN = "YOUR_API_TOKEN_HERE"

module.exports = {
  // Fetch ZeroTier network configuration
  fetchConfig: async (server) => {
    try {
      const response = await axios.get(
        `${ZT_API_BASE_URL}/network/${server._id}`,
        {
          headers: {
            Authorization: `Bearer ${ZT_API_TOKEN}`,
          },
        }
      )
      return response.data.config
    } catch (error) {
      console.error(`Failed to fetch ZeroTier config: ${error}`)
      return null
    }
  },

  // Validate ZeroTier specific configurations
  validateConfig: (config) => {
    if (!config.id || !config.name) {
      console.error("Invalid ZeroTier config")
      return false
    }
    return true
  },

  // Function to start ZeroTier service
  startServer: async (server) => {
    // With ZeroTier, the network is typically always "on" once created
    // You might want to add members or adjust configurations here
  },

  // Function to stop ZeroTier service
  stopServer: async (server) => {
    // With ZeroTier, you might want to deauthorize members or delete the network
  },

  // Authorize a new member to the network
  authorizeMember: async (server, memberId) => {
    // Implement authorization logic here
  },

  // Deauthorize a member from the network
  deauthorizeMember: async (server, memberId) => {
    // Implement deauthorization logic here
  },

  // Check the health of the ZeroTier network
  checkServerHealth: async (server) => {
    try {
      const response = await axios.get(
        `${ZT_API_BASE_URL}/network/${server._id}/status`,
        {
          headers: {
            Authorization: `Bearer ${ZT_API_TOKEN}`,
          },
        }
      )
      // Check if the network is operational
      if (response.data.status !== "OK") {
        return false
      }
      return true
    } catch (error) {
      console.error(`Health check failed for ZeroTier network: ${error}`)
      return false
    }
  },

  // Handle an unhealthy ZeroTier network
  handleError: async (server) => {
    try {
      // Mark the server as "maintenance" in the database
      await Server.findByIdAndUpdate(server._id, { status: "maintenance" })
      // Notify admin or perform other actions
      return true
    } catch (error) {
      console.error(`Failed to handle unhealthy ZeroTier network: ${error}`)
      return false
    }
  },
}

const { exec } = require("child_process")
const Server = require("../models/Server").ServerModel // Make sure the path is correct
const fs = require("fs")
const axios = require("axios")

// Constants (Replace with actual paths and parameters)
const RETRY_COUNT = 3
const OPENVPN_API_BASE_URL = "https://openvpn-access-server-address/restapi"
const ACCESS_TOKEN = "YOUR_ACCESS_TOKEN"

module.exports = {
  // Fetch OpenVPN configuration using REST API
  fetchConfig: async (server) => {
    try {
      const response = await axios.get(
        `${OPENVPN_API_BASE_URL}/config/${server._id}`,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error("Failed to fetch OpenVPN config:", error)
      return null
    }
  },

  validateConfig: (config) => {
    // Validate OpenVPN specific configurations
    if (!config.port || !config.protocol || !config.cipher) {
      console.error("Invalid OpenVPN config")
      this.logActivity("Invalid OpenVPN config")
      return false
    }
    return true
  },

  startServer: async (server, retry = 0) => {
    const config = await this.fetchConfig(server)
    if (!config || !this.validateConfig(config)) {
      this.handleError(server)
      return
    }

    const command = `openvpn --config ${config.configFilePath}`
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting OpenVPN: ${error}`)
        this.logActivity(`Error starting OpenVPN: ${error}`)
        this.startServer(server, retry + 1)
        return
      }
      console.log(`OpenVPN started: ${stdout}`)
      this.logActivity(`OpenVPN started: ${stdout}`)
    })
  },

  stopServer: async (server) => {
    const command = "killall -9 openvpn" // Be cautious with this command
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping OpenVPN: ${error}`)
        this.logActivity(`Error stopping OpenVPN: ${error}`)
        return
      }
      console.log(`OpenVPN stopped: ${stdout}`)
      this.logActivity(`OpenVPN stopped: ${stdout}`)
    })
  },

  checkServerHealth: async (server) => {
    try {
      const response = await axios.get(`${OPENVPN_API_BASE_URL}/health`, {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
      })
      return response.data.isHealthy
    } catch (error) {
      console.error("Health check failed for OpenVPN server:", error)
      return false
    }
  },

  handleError: async (server) => {
    // Flag for manual review and set to maintenance
    try {
      await Server.findByIdAndUpdate(server._id, { status: "maintenance" })
      this.logActivity(`Server set to maintenance mode: ${server._id}`)
    } catch (error) {
      console.error(`Failed to set server to maintenance mode: ${error}`)
      this.logActivity(`Failed to set server to maintenance mode: ${error}`)
    }
  },

  logActivity: (message) => {
    fs.appendFile(
      "openvpn_activity.log",
      `${new Date().toISOString()}: ${message}\n`,
      (err) => {
        if (err) throw err
      }
    )
  },
}

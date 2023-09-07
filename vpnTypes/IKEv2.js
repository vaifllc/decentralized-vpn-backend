const { exec } = require("child_process")
const Server = require("../models/Server") // Assuming Server model is in this path
const fs = require("fs")

// Constants (Replace with actual paths and parameters)
const STRONGSWAN_CONFIG_PATH = "/etc/ipsec.conf"
const RETRY_COUNT = 3

module.exports = {
  // Validate IKEv2 (StrongSwan) specific configurations
  validateConfig: (config) => {
    // You can define your own validation logic based on the StrongSwan config
    return true
  },

  // Function to start StrongSwan server
  startServer: async (server, retry = 0) => {
    if (retry >= RETRY_COUNT) {
      this.handleError(server)
      return
    }

    const command = "ipsec start"
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting StrongSwan: ${error}`)
        this.logActivity(`Error starting StrongSwan: ${error}`)
        this.startServer(server, retry + 1)
        return
      }
      console.log(`StrongSwan started: ${stdout}`)
      this.logActivity(`StrongSwan started: ${stdout}`)
    })
  },

  // Function to stop StrongSwan server
  stopServer: async (server) => {
    const command = "ipsec stop"
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping StrongSwan: ${error}`)
        this.logActivity(`Error stopping StrongSwan: ${error}`)
        return
      }
      console.log(`StrongSwan stopped: ${stdout}`)
      this.logActivity(`StrongSwan stopped: ${stdout}`)
    })
  },

  // Function to reload StrongSwan config
  reloadConfig: async (server) => {
    const command = "ipsec reload"
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error reloading StrongSwan config: ${error}`)
        this.logActivity(`Error reloading StrongSwan config: ${error}`)
        return
      }
      console.log(`StrongSwan config reloaded: ${stdout}`)
      this.logActivity(`StrongSwan config reloaded: ${stdout}`)
    })
  },

  // Function to handle errors
  handleError: async (server) => {
    try {
      server.status = "maintenance"
      await server.save()
      this.logActivity(`Server set to maintenance mode: ${server._id}`)
    } catch (error) {
      console.error(`Failed to set server to maintenance mode: ${error}`)
      this.logActivity(`Failed to set server to maintenance mode: ${error}`)
    }
  },

  // Function to log activities
  logActivity: (message) => {
    fs.appendFile(
      "strongswan_activity.log",
      `${new Date().toISOString()}: ${message}\n`,
      (err) => {
        if (err) throw err
      }
    )
  },
}

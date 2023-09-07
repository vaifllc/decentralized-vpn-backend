const { exec } = require("child_process")
const Server = require("../models/Server") // Assuming Server model is in this path
const axios = require("axios")
const fs = require("fs")
const { exec } = require("child_process")
const util = require("util")
const ping = require("ping")

const execAsync = util.promisify(exec)

// Constants (Replace with actual paths and parameters)
const RETRY_COUNT = 3
const WG_API_ENDPOINT = "https://your-wireguard-api-endpoint.com"

module.exports = {
  fetchConfig: async (server) => {
    try {
      // Fetch the WireGuard configuration from a remote service
      const response = await axios.get(
        `${WG_API_ENDPOINT}/config/${server._id}`
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch WireGuard config: ${error}`)
      return null
    }
  },

  validateConfig: (config) => {
    if (!config.privateKey || !config.publicKey || !config.endpoint) {
      console.error("Invalid WireGuard config")
      return false
    }
    return true
  },

  startServer: async (server, retry = 0) => {
    if (retry >= RETRY_COUNT) {
      this.handleError(server)
      return
    }

    const config = await this.fetchConfig(server)

    if (!this.validateConfig(config)) {
      this.handleError(server)
      return
    }

    // Save the configuration to the database
    server.configDetails = config
    await server.save()

    const command = `wg-quick up wg${server._id}`
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error starting WireGuard: ${error}`)
        this.startServer(server, retry + 1)
        return
      }
      console.log(`WireGuard started: ${stdout}`)
    })
  },

  stopServer: async (server) => {
    const command = `wg-quick down wg${server._id}`
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error stopping WireGuard: ${error}`)
        return
      }
      console.log(`WireGuard stopped: ${stdout}`)
    })
  },

  reloadConfig: async (server) => {
    // Fetch the latest configuration
    const newConfig = await this.fetchConfig(server)

    // Validate the new configuration
    if (!this.validateConfig(newConfig)) {
      console.error("Failed to reload config: Invalid new configuration")
      return
    }

    // Update the configuration in the database
    server.configDetails = newConfig
    await server.save()

    // Reload the WireGuard configuration
    await this.stopServer(server)
    await this.startServer(server)
  },

checkServerHealth: async (server) => {
  try {
    const cpuResponse = await axios.get(`http://${server.ipAddress}:3000/cpu`);
    const memoryResponse = await axios.get(`http://${server.ipAddress}:3000/memory`);
    
    const cpuUtilization = cpuResponse.data.cpuUtilization;
    const memoryUtilization = memoryResponse.data.memoryUtilization;
    
    if (cpuUtilization > 80 || memoryUtilization > 80) {
      console.log('Server health check failed');
      return false;
    }
    console.log('Server health check passed');
    return true;
  } catch (error) {
    console.log(`Failed to check server health: ${error}`);
    return false;
  }
},

  

  handleError: async (server) => {
    // Set the server to maintenance mode
    server.status = "maintenance"
    await server.save()
    console.log(`Server set to maintenance mode: ${server._id}`)
  },
};

async function getCPUUtilization(server) {
  // Implement actual logic to get CPU utilization, possibly from a monitoring API.
  // For demonstration, returning a dummy value.
  return 30;
}

async function getMemoryUtilization(server) {
  // Implement actual logic to get Memory utilization, possibly from a monitoring API.
  // For demonstration, returning a dummy value.
  return 40;
}


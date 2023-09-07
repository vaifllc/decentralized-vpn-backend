const ServerService = require("./ServerService") // Assuming you have this service
const NodeService = require("./NodeService") // Assuming you have this service
const logger = require("../utils/logger") // Assuming you have a logger

class MonitoringService {
  async getServerLoad(serverId) {
    try {
      const load = await ServerService.getServerLoadById(serverId) // Replace with your logic
      logger.info(`Fetched server load for serverId ${serverId}: ${load}%`)
      return load
    } catch (error) {
      logger.error(`Failed to get server load: ${error}`)
      throw error
    }
  }

  async getNodeLoad(nodeId) {
    try {
      const load = await NodeService.getNodeLoadById(nodeId) // Replace with your logic
      logger.info(`Fetched node load for nodeId ${nodeId}: ${load}%`)
      return load
    } catch (error) {
      logger.error(`Failed to get node load: ${error}`)
      throw error
    }
  }

  async getServerStatus(serverId) {
    try {
      const status = await ServerService.getServerStatusById(serverId) // Replace with your logic
      logger.info(`Fetched server status for serverId ${serverId}: ${status}`)
      return status
    } catch (error) {
      logger.error(`Failed to get server status: ${error}`)
      throw error
    }
  }

  async getNodeStatus(nodeId) {
    try {
      const status = await NodeService.getNodeStatusById(nodeId) // Replace with your logic
      logger.info(`Fetched node status for nodeId ${nodeId}: ${status}`)
      return status
    } catch (error) {
      logger.error(`Failed to get node status: ${error}`)
      throw error
    }
  }
}

module.exports = new MonitoringService()

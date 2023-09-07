const ServerLog = require("../models/ServerLog")
const NodeLog = require("../models/NodeLog")
const logger = require("../utils/logger") // Assuming you have a logger

class LogService {
  async saveServerLog(serverId, logData) {
    try {
      const log = new ServerLog({
        serverId,
        ...logData,
      })
      await log.save()
      logger.info(`Server log saved for serverId ${serverId}`)
    } catch (error) {
      logger.error(`Failed to save server log: ${error}`)
      throw error
    }
  }

  async saveNodeLog(nodeId, logData) {
    try {
      const log = new NodeLog({
        nodeId,
        ...logData,
      })
      await log.save()
      logger.info(`Node log saved for nodeId ${nodeId}`)
    } catch (error) {
      logger.error(`Failed to save node log: ${error}`)
      throw error
    }
  }

  async getServerLogs(serverId) {
    try {
      const logs = await ServerLog.find({ serverId }).sort({ createdAt: -1 })
      return logs
    } catch (error) {
      logger.error(`Failed to retrieve server logs: ${error}`)
      throw error
    }
  }

  async getNodeLogs(nodeId) {
    try {
      const logs = await NodeLog.find({ nodeId }).sort({ createdAt: -1 })
      return logs
    } catch (error) {
      logger.error(`Failed to retrieve node logs: ${error}`)
      throw error
    }
  }
}

module.exports = new LogService()

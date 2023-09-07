const Configuration = require("../models/ConfigurationModel")
const Server = require("../models/Server")
const Node = require("../models/Node")
const logger = require("../utils/logger") // Assuming you have a logger

class ConfigurationService {
  async addConfigurationForResource(resourceId, details, isServer = true) {
    try {
      // Add input validation if needed

      const config = new Configuration({
        [isServer ? "serverId" : "nodeId"]: resourceId,
        details,
      })
      await config.save()

      if (isServer) {
        await Server.findByIdAndUpdate(resourceId, { configId: config._id })
      } else {
        await Node.findByIdAndUpdate(resourceId, { configId: config._id })
      }

      logger.info(`Configuration added for resource ${resourceId}`)
      return config
    } catch (error) {
      logger.error(`Error in addConfigurationForResource: ${error}`)
      throw error
    }
  }

  async updateConfiguration(configId, updatedDetails) {
    try {
      // Add input validation if needed

      const config = await Configuration.findByIdAndUpdate(
        configId,
        { details: updatedDetails },
        { new: true }
      )

      logger.info(`Configuration ${configId} updated`)
      return config
    } catch (error) {
      logger.error(`Error in updateConfiguration: ${error}`)
      throw error
    }
  }

  async deleteConfiguration(configId) {
    try {
      await Configuration.findByIdAndDelete(configId)
      logger.info(`Configuration ${configId} deleted`)
    } catch (error) {
      logger.error(`Error in deleteConfiguration: ${error}`)
      throw error
    }
  }

  async getConfigurationForResource(resourceId, isServer = true) {
    try {
      const query = isServer ? { serverId: resourceId } : { nodeId: resourceId }
      const config = await Configuration.findOne(query)

      logger.info(`Configuration fetched for resource ${resourceId}`)
      return config
    } catch (error) {
      logger.error(`Error in getConfigurationForResource: ${error}`)
      throw error
    }
  }
}

module.exports = new ConfigurationService()

const EmailService = require("./EmailService") // Mock Email Service
const logger = require("./logger") // Mock Logger
const Server = require("../models/Server") // Mock Server model

class AlertService {
  async sendServerDownAlert(serverId) {
    try {
      // Fetch server details from database (replace with actual DB call)
      const server = await Server.findById(serverId)
      if (!server) {
        return
      }

      // Send email alert
      await EmailService.sendEmail({
        to: "admin@example.com",
        subject: `Server Down Alert for ${server.name}`,
        body: `Server ${server.name} is down. Immediate action required.`,
      })

      // Log alert
      logger.info(`Server Down Alert sent for ${server.name}`)
    } catch (error) {
      logger.error(`Failed to send Server Down Alert: ${error}`)
    }
  }

  async sendNodeDownAlert(nodeId) {
    try {
      // Fetch node details from database (replace with actual DB call)
      const node = await Node.findById(nodeId)
      if (!node) {
        return
      }

      // Send email alert
      await EmailService.sendEmail({
        to: "admin@example.com",
        subject: `Node Down Alert for ${node.name}`,
        body: `Node ${node.name} is down. Immediate action required.`,
      })

      // Log alert
      logger.info(`Node Down Alert sent for ${node.name}`)
    } catch (error) {
      logger.error(`Failed to send Node Down Alert: ${error}`)
    }
  }

  async sendHighLoadAlert(resourceId, resourceType) {
    try {
      // Fetch resource details from database based on resourceType (replace with actual DB call)
      let resource
      if (resourceType === "server") {
        resource = await Server.findById(resourceId)
      } else if (resourceType === "node") {
        resource = await Node.findById(resourceId)
      }

      if (!resource) {
        return
      }

      // Send email alert
      await EmailService.sendEmail({
        to: "admin@example.com",
        subject: `High Load Alert for ${resourceType} ${resource.name}`,
        body: `${
          resourceType.charAt(0).toUpperCase() + resourceType.slice(1)
        } ${
          resource.name
        } is experiencing high load. Immediate action required.`,
      })

      // Log alert
      logger.info(`High Load Alert sent for ${resourceType} ${resource.name}`)
    } catch (error) {
      logger.error(`Failed to send High Load Alert: ${error}`)
    }
  }
}

module.exports = new AlertService()

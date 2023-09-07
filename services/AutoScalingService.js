const ServerService = require("./ServerService") // Your existing ServerService
const NodeService = require("./NodeService") // Assuming you've created this
const logger = require("../utils/logger") // Your existing logger
const AlertService = require("./AlertService") // Your AlertService for notifications

class AutoScalingService {
  async checkAndScaleServers() {
    try {
      const servers = await ServerService.getAllServers()

      for (const server of servers) {
        if (server.load > 80) {
          // Scale up
          console.log(`Scaling up server ${server.name}`)
          logger.info(`Scaling up server ${server.name}`)
          AlertService.sendHighLoadAlert(server.id, "server")

          // Actual logic to scale up server
          await ServerService.scaleUp(server.id)
        } else if (server.load < 20 && server.load !== 0) {
          // Scale down
          console.log(`Scaling down server ${server.name}`)
          logger.info(`Scaling down server ${server.name}`)

          // Actual logic to scale down server
          await ServerService.scaleDown(server.id)
        }
      }
    } catch (error) {
      logger.error(`Error in checkAndScaleServers: ${error}`)
    }
  }

  async checkAndScaleNodes() {
    try {
      const nodes = await NodeService.getAllNodes()

      for (const node of nodes) {
        if (node.load > 80) {
          // Scale up
          console.log(`Scaling up node ${node.name}`)
          logger.info(`Scaling up node ${node.name}`)
          AlertService.sendHighLoadAlert(node.id, "node")

          // Actual logic to scale up node
          await NodeService.scaleUp(node.id)
        } else if (node.load < 20 && node.load !== 0) {
          // Scale down
          console.log(`Scaling down node ${node.name}`)
          logger.info(`Scaling down node ${node.name}`)

          // Actual logic to scale down node
          await NodeService.scaleDown(node.id)
        }
      }
    } catch (error) {
      logger.error(`Error in checkAndScaleNodes: ${error}`)
    }
  }

  async autoScale() {
    await this.checkAndScaleServers()
    await this.checkAndScaleNodes()
  }
}

module.exports = new AutoScalingService()

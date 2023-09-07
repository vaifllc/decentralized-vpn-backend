const fs = require("fs").promises // Use promise-based fs methods
const path = require("path")
const Node = require("../models/Node")
const NodeHealthCheck = require("../healthChecks/NodeHealthCheck")
const logger = require("../utils/logger") // Assuming you have a logger

class NodeService {
  async createNode(nodeData, tenantId) {
    try {
      const newNode = new Node({ ...nodeData, tenantId })
      await newNode.save()

      const fileName = `${newNode._id}-config.json`
      const filePath = await this.saveNodeConfigFile(
        fileName,
        newNode.configDetails
      )

      newNode.configFile = filePath
      await newNode.save()

      return newNode
    } catch (error) {
      logger.error(`Error in createNode: ${error}`)
      throw error
    }
  }

  async updateNode(nodeId, updatedData, tenantId) {
    try {
      const node = await Node.findOneAndUpdate(
        { _id: nodeId, tenantId },
        updatedData,
        { new: true }
      )
      if (!node) {
        throw new Error("Node not found or you do not have permission")
      }
      return node
    } catch (error) {
      logger.error(`Error in updateNode: ${error}`)
      throw error
    }
  }

  async deleteNode(nodeId, tenantId) {
    try {
      const node = await Node.findOneAndDelete({ _id: nodeId, tenantId })
      if (!node) {
        throw new Error("Node not found or you do not have permission")
      }
    } catch (error) {
      logger.error(`Error in deleteNode: ${error}`)
      throw error
    }
  }

  async checkNodeHealth(nodeId, tenantId) {
    try {
      const node = await Node.findOne({ _id: nodeId, tenantId })
      if (!node) {
        return null
      }
      const isHealthy = await NodeHealthCheck.checkNodeHealth(node)
      node.status = isHealthy ? "online" : "maintenance"
      await node.save()
      return node.status
    } catch (error) {
      logger.error(`Error in checkNodeHealth: ${error}`)
      throw error
    }
  }

  async saveNodeConfigFile(fileName, data) {
    try {
      const filePath = path.join(__dirname, "..", "nodeConfigFiles", fileName)

      try {
        await fs.access(filePath)
        logger.warn(`Config file ${fileName} already exists. Overwriting.`)
      } catch (error) {
        // File does not exist, proceed to write
        logger.info(`Config file ${fileName} does not exist. Creating new one.`)
      }

      await fs.writeFile(filePath, JSON.stringify(data, null, 2))
      return filePath
    } catch (error) {
      logger.error(`Error in saveNodeConfigFile: ${error}`)
      throw error
    }
  }
}

module.exports = new NodeService()

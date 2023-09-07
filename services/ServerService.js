const Server = require("../models/Server")
const Node = require("../models/Node")
const OpenVPNHealthCheck = require("../healthChecks/OpenVPNHealthCheck")
const IKEv2HealthCheck = require("../healthChecks/IKEv2HealthCheck")
const WireGuardHealthCheck = require("../healthChecks/WireGuardHealthCheck")
const ZeroTierHealthCheck = require("../healthChecks/ZeroTierHealthCheck")

class ServerService {
  async addServer(serverData, configFilePath) {
    const newServer = new Server({ ...serverData, configFilePath })
    await newServer.save()
    return newServer
  }

  async updateServer(serverId, updatedData, configFilePath) {
    const updatedServer = await Server.findByIdAndUpdate(
      serverId,
      { ...updatedData, configFilePath },
      { new: true }
    )
    return updatedServer
  }

  async deleteServer(serverId) {
    await Server.findByIdAndDelete(serverId)
  }

  async getServerStatus(serverId) {
    const server = await Server.findById(serverId)
    return server ? server.status : null
  }

  async getAllServers(tenantId) {
    return await Server.find({ tenantId })
  }

  async getLeastLoadedServer(preferredType = null, preferredCountry = null) {
    let query = { load: { $lt: 100 } }

    if (preferredType) {
      query.type = preferredType
    }

    if (preferredCountry) {
      query.country = preferredCountry
    }

    const servers = await Server.find(query)
      .sort({ weight: -1, load: 1 })
      .exec()

    if (!servers || servers.length === 0) {
      throw new Error("No suitable server found.")
    }

    return servers[0]
  }

  async checkServerHealth(serverId) {
    const server = await Server.findById(serverId)
    if (!server) {
      return null
    }
    let isHealthy = false

    switch (server.type) {
      case "openvpn":
        isHealthy = await OpenVPNHealthCheck.checkServerHealth(server)
        break
      case "ikev2":
        isHealthy = await IKEv2HealthCheck.checkServerHealth(server)
        break
      case "wireguard":
        isHealthy = await WireGuardHealthCheck.checkServerHealth(server)
        break
      case "zerotier":
        isHealthy = await ZeroTierHealthCheck.checkServerHealth(server)
        break
      default:
        break
    }

    if (isHealthy) {
      server.status = "online"
    } else {
      server.status = "maintenance"
    }

    await server.save()
    return server.status
  }

  async getLeastLoadedNode(preferredType = null, preferredCountry = null) {
    let query = { load: { $lt: 100 } }

    if (preferredType) {
      query.type = preferredType
    }

    if (preferredCountry) {
      query.country = preferredCountry
    }

    const node = await Node.find(query).sort({ load: 1 }).limit(1).exec()
    if (!node || node.length === 0) {
      throw new Error("No suitable node found.")
    }

    return node[0]
  }

  async allocateResourceToUser(
    userId,
    preferredServerType = null,
    preferredNodeType = null,
    preferredCountry = null
  ) {
    try {
      const server = await this.getLeastLoadedServer(
        preferredServerType,
        preferredCountry
      )
      server.load += 1
      await server.save()

      const node = await this.getLeastLoadedNode(
        preferredNodeType,
        preferredCountry
      )
      node.load += 1
      await node.save()

      await UserServerNodeMapping.create({
        userId,
        serverId: server._id,
        nodeId: node._id,
      })

      return { server, node }
    } catch (error) {
      throw new Error("Failed to allocate resources: " + error.message)
    }
  }
}

class UserServerNodeMapping {
  static async create(data) {
    console.log("Saved mapping:", data)
  }
}

module.exports = new ServerService()

const Server = require("../models/Server")
const ServerService = require("../services/ServerService")

const checkAndUpdateServer = async (server) => {
  try {
    const isHealthy = await ServerService.checkServerHealth(server)
    if (!isHealthy) {
      return { _id: server._id, status: "maintenance" }
    }
    return null
  } catch (error) {
    console.error(`Failed to check health for server ${server._id}:`, error)
    return null
  }
}

const performHealthChecks = async () => {
  try {
    const servers = await Server.find({})
    const updatePromises = servers.map(checkAndUpdateServer)
    const updates = await Promise.all(updatePromises)

    const serversToUpdate = updates.filter((update) => update !== null)
    if (serversToUpdate.length > 0) {
      const bulkOps = serversToUpdate.map((update) => ({
        updateOne: {
          filter: { _id: update._id },
          update: { $set: { status: update.status } },
        },
      }))
      await Server.bulkWrite(bulkOps)
    }
  } catch (error) {
    console.error("Failed to perform health checks:", error)
  }
}

// Run the health checks every 10 minutes
setInterval(performHealthChecks, 600000)

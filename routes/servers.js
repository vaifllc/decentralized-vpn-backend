const express = require("express")
const router = express.Router()
const {
  requireAdmin,
  requireUser,
  hasPermission,
} = require("../middleware/authorization")
const serverController = require("../controllers/serverController")
const { validateServer } = require("../middleware/validation")
const {
  createServer,
  listServers,
  checkServerStatus,
  updateServer,
  deleteServer,
  connectUserToServer,
  disconnectUserFromServer,
  getLeastLoadedServer,
} = require("../controllers/serverController")


// Create a new server
router.post("/", requireAdmin, hasPermission("createServer"), validateServer, serverController.createServer);


// List all servers
router.get("/", serverController.listServers);

// Check the status of a specific server
router.get("/:serverId/status", serverController.checkServerStatus);

// Update a specific server
router.put("/:serverId", requireAdmin, hasPermission("updateServer"), validateServer, serverController.updateServer);


// Delete a specific server
router.delete("/:serverId", requireAdmin, hasPermission("deleteServer"), serverController.deleteServer);


// Connect a user to the least loaded server
router.post("/connect", requireUser, serverController.connectUserToServer);

// Disconnect a user from a server and update the load
router.post("/disconnect", requireUser, serverController.disconnectUserFromServer);

// Fetch the least loaded server (could be for admin stats or diagnostics)
router.get("/least-loaded", serverController.getLeastLoadedServer);

router.get(
  "/:serverId/vpn-config",
  requireAdmin,
  hasPermission("viewServer"),
  async (req, res) => {
    const serverId = req.params.serverId
    try {
      const server = await Server.findById(serverId)
      if (!server) {
        return res.status(404).json({ error: "Server not found." })
      }
      res.status(200).json(server.configDetails)
    } catch (error) {
      res.status(500).json({
        error: `Failed to fetch VPN configuration. Error: ${error.message}`,
      })
    }
  }
)

router.put(
  "/:serverId/vpn-config",
  requireAdmin,
  hasPermission("updateServer"),
  async (req, res) => {
    const serverId = req.params.serverId
    const configDetails = req.body

    try {
      const server = await Server.findById(serverId)
      if (!server) {
        return res.status(404).json({ error: "Server not found." })
      }
      const validatedConfigDetails = getVPNConfigDetails(
        server.type,
        configDetails
      )
      server.configDetails = validatedConfigDetails
      await server.save()
      res.status(200).json(server)
    } catch (error) {
      res.status(500).json({
        error: `Failed to update VPN configuration. Error: ${error.message}`,
      })
    }
  }
)

module.exports = router

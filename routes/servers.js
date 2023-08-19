const express = require("express")
const router = express.Router()
const serverController = require("../controllers/serverController")

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

const { requireAdmin } = require("../middleware/authorization")
const { hasPermission } = require("../middleware/authorization")

// Create a new server
router.post("/", requireAdmin, hasPermission("createServer"), createServer)

// List all servers
router.get("/", listServers)

// Check the status of a specific server
router.get("/:serverId/status", checkServerStatus)

// Update a specific server
router.put(
  "/:serverId",
  requireAdmin,
  hasPermission("updateServer"),
  updateServer
)

// Delete a specific server
router.delete(
  "/:serverId",
  requireAdmin,
  hasPermission("deleteServer"),
  deleteServer
)

// Connect a user to the least loaded server
router.post("/connect", connectUserToServer)

// Disconnect a user from a server and update the load
router.post("/disconnect", disconnectUserFromServer)

// Fetch the least loaded server (could be for admin stats or diagnostics)
router.get("/least-loaded", getLeastLoadedServer)

module.exports = router

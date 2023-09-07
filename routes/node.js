const express = require("express")
const router = express.Router()
const nodeController = require("../controllers/nodeController")

const { requireAdmin } = require("../middleware/authorization")
const { hasPermission } = require("../middleware/authorization")

// Create a new node
router.post(
  "/",
  requireAdmin,
  hasPermission("createNode"),
  nodeController.createNode
)

// List all nodes with optional pagination, sorting, and filtering
router.get("/", nodeController.listNodes)

// Get details of a specific node
router.get("/:nodeId", nodeController.getNode)

// Update a specific node
router.put(
  "/:nodeId",
  requireAdmin,
  hasPermission("updateNode"),
  nodeController.updateNode
)

// Delete a specific node
router.delete(
  "/:nodeId",
  requireAdmin,
  hasPermission("deleteNode"),
  nodeController.deleteNode
)

// Check the health status of a specific node
router.get(
  "/:nodeId/health",
  requireAdmin,
  hasPermission("checkNodeHealth"),
  nodeController.checkNodeHealth
)

module.exports = router

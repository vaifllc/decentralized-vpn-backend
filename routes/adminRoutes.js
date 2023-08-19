const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { requireAdmin } = require("../middleware/authorization")

// User management
router.route("/users").get(requireAdmin, adminController.listUsers) // List all users

router
  .route("/users/:id")
  .get(requireAdmin, adminController.viewUser) // View a specific user
  .put(requireAdmin, adminController.updateUser) // Update user details
  .delete(requireAdmin, adminController.deleteUser) // Delete a user

// VPN server operations
router
  .route("/servers/:serverId/logs")
  .get(requireAdmin, adminController.viewServerLogs) // View server logs

router
  .route("/servers/:serverId/control")
  .post(requireAdmin, adminController.controlServer) // Control a server (restart/shutdown)

router
  .route("/servers/:serverId/metrics")
  .get(requireAdmin, adminController.viewServerMetrics) // View server metrics

module.exports = router

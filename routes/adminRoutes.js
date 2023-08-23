const express = require("express")
const router = express.Router()
const adminController = require("../controllers/adminController")
const { requireAdmin } = require("../middleware/authorization")

// User management
/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags:
 *       - Admin
 *     description: List all users with filtering, sorting, and pagination
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: page
 *         description: Page number for pagination
 *         in: query
 *         required: false
 *         type: integer
 *       - name: limit
 *         description: Number of records per page
 *         in: query
 *         required: false
 *         type: integer
 *       - name: sort
 *         description: Sorting criteria
 *         in: query
 *         required: false
 *         type: string
 *       - name: filter
 *         description: Filter criteria
 *         in: query
 *         required: false
 *         type: string
 *     responses:
 *       200:
 *         description: List of users
 *       400:
 *         description: Validation error
 */
router.route("/users").get(requireAdmin, adminController.listUsers) // List all users

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     tags:
 *       - Admin
 *     description: View details of a specific user
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: userId
 *         description: ID of the user to retrieve details
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: User details
 *       400:
 *         description: Validation error
 *       404:
 *         description: User not found
 */
router
  .route("/users/:id")
  .get(requireAdmin, adminController.viewUser) // View a specific user
  .put(requireAdmin, adminController.updateUser) // Update user details
  .delete(requireAdmin, adminController.deleteUser) // Delete a user

// VPN server operations

/**
 * @swagger
 * /admin/servers:
 *   get:
 *     tags:
 *       - Admin
 *     description: List all servers
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: List of servers
 */
router
  .route("/servers/:serverId/logs")
  .get(requireAdmin, adminController.viewServerLogs) // View server logs
/**
 * @swagger
 * /admin/servers/{serverId}:
 *   get:
 *     tags:
 *       - Admin
 *     description: View details of a specific server
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: serverId
 *         description: ID of the server to retrieve details
 *         in: path
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: Server details
 *       404:
 *         description: Server not found
 */
router
  .route("/servers/:serverId/control")
  .post(requireAdmin, adminController.controlServer) // Control a server (restart/shutdown)

router
  .route("/servers/:serverId/metrics")
  .get(requireAdmin, adminController.viewServerMetrics) // View server metrics

module.exports = router

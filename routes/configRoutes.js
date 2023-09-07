const express = require("express")
const router = express.Router()
const configController = require("../controllers/configController")
const { requireAdmin } = require("../middleware/authorization")
const { hasPermission } = require("../middleware/authorization")

// Upload a new configuration file
router.post(
  "/upload",
  requireAdmin,
  hasPermission("uploadConfig"),
  configController.uploadConfigFile
)

// Fetch a configuration file
router.get(
  "/:id",
  requireAdmin,
  hasPermission("viewConfig"),
  configController.fetchConfigFile
)

// Update a configuration file
router.put(
  "/:id/update",
  requireAdmin,
  hasPermission("updateConfig"),
  configController.updateConfigFile
)

// Delete a configuration file
router.delete(
  "/:id/delete",
  requireAdmin,
  hasPermission("deleteConfig"),
  configController.deleteConfigFile
)

module.exports = router

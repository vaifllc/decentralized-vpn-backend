const express = require("express")
const router = express.Router()
const addOnController = require("../controllers/addOnController")
//const { checkToken } = require("../middleware/checkToken")
const { requireAdmin } = require("../middleware/authorization")

// Create a new add-on (only admin)
router.post("/create",  requireAdmin, addOnController.createAddOn)

// List all available add-ons (open to all authenticated users)
router.get("/list",  addOnController.listAddOns)

// Fetch details of a specific add-on (open to all authenticated users)
router.get("/:addOnId",  addOnController.getAddOn)

// Update an add-on (only admin)
router.put("/:addOnId",  requireAdmin, addOnController.updateAddOn)

// Delete an add-on (only admin)
router.delete(
  "/:addOnId",
  
  requireAdmin,
  addOnController.deleteAddOn
)

module.exports = router

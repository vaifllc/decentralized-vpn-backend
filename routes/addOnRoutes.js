const express = require("express")
const router = express.Router()
const addOnController = require("../controllers/addOnController")

// Create a new add-on
router.post("/create", addOnController.createAddOn);

// List all available add-ons
router.get("/list", addOnController.listAddOns);

// Fetch details of a specific add-on
router.get("/:addOnId", addOnController.getAddOn);

// Update an add-on
router.put("/:addOnId", addOnController.updateAddOn);

// Delete an add-on
router.delete("/:addOnId", addOnController.deleteAddOn);



module.exports = router

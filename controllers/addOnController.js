const AddOn = require("../models/AddOn")

// Create a new add-on
exports.createAddOn = async (req, res) => {
  try {
    const newAddOn = new AddOn(req.body)
    await newAddOn.save()
    res.status(201).json({ message: "Add-on created successfully", newAddOn })
  } catch (error) {
    res.status(500).json({ error: `Failed to create add-on: ${error.message}` })
  }
}

// List all available add-ons
exports.listAddOns = async (req, res) => {
  try {
    const addOns = await AddOn.find()
    res.status(200).json({ addOns })
  } catch (error) {
    res.status(500).json({ error: `Failed to list add-ons: ${error.message}` })
  }
}

// Fetch details of a specific add-on
exports.getAddOn = async (req, res) => {
  try {
    const addOn = await AddOn.findById(req.params.addOnId)
    if (!addOn) {
      return res.status(404).json({ error: "Add-on not found" })
    }
    res.status(200).json({ addOn })
  } catch (error) {
    res.status(500).json({ error: `Failed to get add-on: ${error.message}` })
  }
}

// Update an add-on
exports.updateAddOn = async (req, res) => {
  try {
    const addOn = await AddOn.findByIdAndUpdate(req.params.addOnId, req.body, {
      new: true,
    })
    if (!addOn) {
      return res.status(404).json({ error: "Add-on not found" })
    }
    res.status(200).json({ message: "Add-on updated successfully", addOn })
  } catch (error) {
    res.status(500).json({ error: `Failed to update add-on: ${error.message}` })
  }
}

// Delete an add-on
exports.deleteAddOn = async (req, res) => {
  try {
    const addOn = await AddOn.findByIdAndDelete(req.params.addOnId)
    if (!addOn) {
      return res.status(404).json({ error: "Add-on not found" })
    }
    res.status(200).json({ message: "Add-on deleted successfully" })
  } catch (error) {
    res.status(500).json({ error: `Failed to delete add-on: ${error.message}` })
  }
}

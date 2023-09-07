const Configuration = require("../models/ConfigurationModel")
const mongoose = require("mongoose")

exports.uploadConfigFile = async (req, res, next) => {
  try {
    const newConfig = new Configuration({
      _id: new mongoose.Types.ObjectId(),
      serverId: req.body.serverId, // These could come from the request body
      nodeId: req.body.nodeId, // or could be determined some other way.
      details: req.body.details,
    })

    await newConfig.save()
    res
      .status(201)
      .json({ message: "Configuration created successfully", newConfig })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to create configuration: ${error.message}` })
  }
}

exports.fetchConfigFile = async (req, res, next) => {
  try {
    const config = await Configuration.findById(req.params.configId)

    if (!config) {
      return res.status(404).json({ error: "Configuration not found" })
    }

    res.status(200).json({ config })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to fetch configuration: ${error.message}` })
  }
}

exports.updateConfigFile = async (req, res, next) => {
  try {
    const updatedConfig = await Configuration.findByIdAndUpdate(
      req.params.configId,
      req.body,
      { new: true }
    )

    if (!updatedConfig) {
      return res.status(404).json({ error: "Configuration not found" })
    }

    res
      .status(200)
      .json({ message: "Configuration updated successfully", updatedConfig })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to update configuration: ${error.message}` })
  }
}

exports.deleteConfigFile = async (req, res, next) => {
  try {
    const config = await Configuration.findByIdAndDelete(req.params.configId)

    if (!config) {
      return res.status(404).json({ error: "Configuration not found" })
    }

    res.status(200).json({ message: "Configuration deleted successfully" })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete configuration: ${error.message}` })
  }
}

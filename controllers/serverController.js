const Server = require("../models/Server")
const ConnectionLog = require("../models/connectionLog")


exports.createServer = async (req, res) => {
  const { name, type, ip_address, country, city, port, config_file } = req.body

  

  // Simple validation
  if (
    !name ||
    !type ||
    !ip_address ||
    !country ||
    !city ||
    !port ||
    !config_file
  ) {
    return res.status(400).json({ error: "All fields are required." })
  }

  try {
    const newServer = new Server(req.body)
    await newServer.save()
    res.status(201).json(newServer)
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to create server. Error: ${error.message}` })
  }
}

exports.updateServer = async (req, res) => {
  const serverId = req.params.serverId

  if (!serverId) {
    return res.status(400).json({ error: "Server ID is required." })
  }

  try {
    const server = await Server.findByIdAndUpdate(serverId, req.body, {
      new: true,
    })
    if (!server) {
      return res.status(404).json({ error: "Server not found." })
    }
    res.status(200).json(server)
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to update server. Error: ${error.message}` })
  }
}

exports.deleteServer = async (req, res) => {
  const serverId = req.params.serverId

  if (!serverId) {
    return res.status(400).json({ error: "Server ID is required." })
  }

  try {
    const server = await Server.findByIdAndDelete(serverId)
    if (!server) {
      return res.status(404).json({ error: "Server not found." })
    }
    res.status(200).json({ message: "Server deleted successfully." })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete server. Error: ${error.message}` })
  }
}

exports.getLeastLoadedServer = async () => {
  try {
    const server = await Server.find({ load: { $lt: 100 } })
      .sort({ load: 1 }) // Ascending sort to get the least loaded server first
      .limit(1)
      .exec()
    if (!server || server.length === 0) {
      throw new Error("All servers are fully loaded.")
    }
    return server[0]
  } catch (error) {
    throw error
  }
}

exports.connectUserToServer = async (req, res) => {
  try {
    const server = await getLeastLoadedServer()
    server.load += 1
    await server.save()
    res.json(server)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

exports.disconnectUserFromServer = async (req, res) => {
  try {
    const { serverId } = req.body
    const server = await Server.findById(serverId)
    if (!server) {
      return res.status(404).json({ error: "Server not found." })
    }
    server.load = Math.max(0, server.load - 1) // Ensure load doesn't go negative
    await server.save()
    res.json({ message: "Disconnected successfully." })
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect." })
  }
}

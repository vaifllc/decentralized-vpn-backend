const Server = require("../models/Server").ServerModel
const OpenVPN = require("../vpnTypes/OpenVPN")
const ConnectionLog = require("../models/connectionLog")
const ip = require("ip")
const IKEv2 = require("../vpnTypes/IKEv2")
const WireGuard = require("../vpnTypes/WireGuard")
const ZeroTier = require("../vpnTypes/ZeroTier")
const ServerService = require("../services/ServerService")
const fs = require("fs")
const path = require("path")

// Utility function to handle errors and send response
const handleError = (res, statusCode, message) => {
  res.status(statusCode).json({ error: message });
};

// Function to save config file to disk
const saveConfigFile = (fileName, data) => {
  const filePath = path.join(__dirname, '..', 'configFiles', fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  return filePath;
};

// Function to validate and return VPN-specific configurations
const getVPNConfigDetails = (type, configDetails) => {
  let validatedConfig = {};

  switch (type) {
    case "openvpn":
      // Port validation
      if (configDetails.port && configDetails.port >= 1 && configDetails.port <= 65535) {
        validatedConfig.port = configDetails.port;
      } else {
        throw new Error('Invalid OpenVPN port');
      }
      
      // Protocol validation
      if (["tcp", "udp"].includes(configDetails.protocol)) {
        validatedConfig.protocol = configDetails.protocol;
      } else {
        throw new Error('Invalid OpenVPN protocol');
      }
      break;

    case "ikev":
      // Encryption validation
      if (["aes", "3des"].includes(configDetails.encryption)) {
        validatedConfig.encryption = configDetails.encryption;
      } else {
        throw new Error('Invalid IKEv encryption type');
      }
      
      // Integrity algorithm validation
      if (["sha256", "sha1"].includes(configDetails.integrity)) {
        validatedConfig.integrity = configDetails.integrity;
      } else {
        throw new Error('Invalid IKEv integrity algorithm');
      }
      break;

    case "wireguard":
      // Public key validation
      if (configDetails.publicKey && configDetails.publicKey.length === 44) {
        validatedConfig.publicKey = configDetails.publicKey;
      } else {
        throw new Error('Invalid WireGuard public key');
      }
      
      // Endpoint validation (simplified)
      if (configDetails.endpoint && ip.isV4Format(configDetails.endpoint.split(':')[0])) {
        validatedConfig.endpoint = configDetails.endpoint;
      } else {
        throw new Error('Invalid WireGuard endpoint');
      }
      break;

    case "zerotier":
      // Network ID validation
      if (configDetails.networkId && /^[0-9a-fA-F]{16}$/.test(configDetails.networkId)) {
        validatedConfig.networkId = configDetails.networkId;
      } else {
        throw new Error('Invalid ZeroTier network ID');
      }
      break;

    default:
      throw new Error('Invalid VPN type');
  }

  return validatedConfig;
};


// Function to create and save the config file
const createAndSaveConfigFile = async (server) => {
  const filePath = saveConfigFile(
    `${server._id}-config.json`,
    server.configDetails
  );
  server.configFile = filePath;
  await server.save();
};

// Create a new server
exports.createServer = async (req, res, next) => {
  const serverData = req.body

  if (!ip.isV4Format(serverData.ipAddress)) {
    return res.status(400).json({ error: "Invalid IP address format." })
  }

  try {
    // Validate VPN config details
    serverData.configDetails = getVPNConfigDetails(
      serverData.type,
      serverData.configDetails
    )

    const newServer = await ServerService.addServer(serverData)
    const filePath = saveConfigFile(
      `${newServer._id}-config.json`,
      newServer.configDetails
    )
    newServer.configFile = filePath
    await newServer.save()
    res.status(201).json(newServer)
  } catch (error) {
    res.status(400).json({ error: `Validation failed. ${error.message}` })
  }
}

exports.updateServer = async (req, res) => {
  const serverId = req.params.serverId
  const serverData = req.body

  try {
    // Validate VPN config details
    serverData.configDetails = getVPNConfigDetails(
      serverData.type,
      serverData.configDetails
    )

    const updatedServer = await ServerService.updateServer(serverId, serverData)
    const filePath = saveConfigFile(
      `${updatedServer._id}-config.json`,
      updatedServer.configDetails
    )
    updatedServer.configFile = filePath
    await updatedServer.save()
    res.status(200).json(updatedServer)
  } catch (error) {
    res.status(400).json({ error: `Validation failed. ${error.message}` })
  }
}


exports.deleteServer = async (req, res) => {
  const serverId = req.params.serverId

  try {
    await ServerService.deleteServer(serverId)
    res.status(204).send()
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to delete server. Error: ${error.message}` })
  }
}

exports.getServerStatus = async (req, res) => {
  const serverId = req.params.serverId

  try {
    const status = await ServerService.getServerStatus(serverId)
    res.status(200).json({ status })
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to get server status. Error: ${error.message}` })
  }
}

exports.getAllServers = async (req, res) => {
  const protocolFilter = req.query.protocols // Capture the 'protocols' query parameter

  let query = {}

  if (protocolFilter) {
    query.protocols = { $in: protocolFilter.split(",") } // Create a query to filter by protocols
  }

  try {
    const servers = await Server.find(query) // Pass the query to the find method
    res.status(200).json(servers)
  } catch (error) {
    res
      .status(500)
      .json({ error: `Failed to get all servers. Error: ${error.message}` })
  }
}

// Enhanced getLeastLoadedServer function
exports.getLeastLoadedServer = async (preferredType, preferredCountry) => {
  try {
    // Basic query to find servers with load less than 100
    const query = { load: { $lt: 100 }, status: "online" }

    // If preferredType is specified, add it to the query
    if (preferredType) {
      query.type = preferredType
    }

    // If preferredCountry is specified, add it to the query
    if (preferredCountry) {
      query.country = preferredCountry
    }

    // Fetch the server based on the query
    const server = await Server.find(query)
      .sort({ load: 1 }) // Sort by load in ascending order
      .limit(1) // Limit to one result
      .exec()

    // If no server is found, throw an error
    if (!server || server.length === 0) {
      throw new Error("No suitable server found.")
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

exports.getLoadBalancedServer = async (req, res) => {
  try {
    const server = await ServerService.getLoadBalancedServer()
    res.status(200).json(server)
  } catch (error) {
    res.status(500).json({
      error: `Failed to get a load-balanced server. Error: ${error.message}`,
    })
  }
}

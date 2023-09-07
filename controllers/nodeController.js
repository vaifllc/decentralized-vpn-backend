const NodeService = require("../services/NodeService")
const createAuditTrail = require("../utils/createAuditTrail")
const validateNodeInput = require("../validators/nodeValidator")

// Create a new node
exports.createNode = async (req, res, next) => {
  try {
    // 1. Input validation
    const validationErrors = validateNodeInput(req.body)
    if (validationErrors.length > 0) {
      return res.status(400).json({ errors: validationErrors })
    }

    const newNode = await NodeService.createNode({
      ...req.body,
      tenantId: req.tenantId,
    })

    // 2. Logging and auditing
    createAuditTrail(req.user.id, "Node Created", newNode)

    res
      .status(201)
      .json({ message: "Node created successfully", data: newNode })
  } catch (error) {
    next(error)
  }
}

// Update a specific node
// Update a specific node
exports.updateNode = async (req, res, next) => {
  try {
    const updatedNode = await NodeService.updateNode(
      req.params.nodeId,
      { ...req.body, tenantId: req.tenantId }
    );
    res.status(200).json({ message: "Node updated successfully", data: updatedNode });
  } catch (error) {
    next(error);
  }
};

// Delete a specific node
exports.deleteNode = async (req, res, next) => {
  try {
    await NodeService.deleteNode(req.params.nodeId, req.tenantId) // Include tenant ID in service
    res.status(200).json({ message: "Node deleted successfully" })
  } catch (error) {
    next(error)
  }
}

// Check the health status of a node
exports.checkNodeHealth = async (req, res, next) => {
  try {
    const status = await NodeService.checkNodeHealth(
      req.params.nodeId,
      req.tenantId
    ) // Include tenant ID in service
    if (status) {
      res.status(200).json({ status })
    } else {
      res.status(404).json({ error: "Node not found" })
    }
  } catch (error) {
    next(error)
  }
}

// List all nodes
// List all nodes
exports.listNodes = async (req, res, next) => {
  const protocolFilter = req.query.protocols;

  let query = protocolFilter
    ? { protocols: { $in: protocolFilter.split(",") }, tenantId: req.tenantId }
    : { tenantId: req.tenantId };

  try {
    // 3. Reusable Pagination
    const { page = 1, limit = 10, sort = "createdAt" } = req.query;
    const nodes = await Node.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const count = await Node.countDocuments(query);

    // 4. Logging and auditing
    createAuditTrail(req.user.id, "List Nodes", `Listed ${nodes.length} nodes`);

    res.status(200).json({
      total: count,
      pages: Math.ceil(count / limit),
      data: nodes,
    });
  } catch (error) {
    next(error);
  }
};



// ... (other methods can go here)

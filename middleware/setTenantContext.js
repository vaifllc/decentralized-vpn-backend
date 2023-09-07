const logger = require("../utils/logger")
const Tenant = require("../models/Tenant") // Import your Tenant model
const { isValidTenant } = require("../utils/validators") // hypothetical import
const { TENANT_ID_HEADER } = require("../utils/constants") // hypothetical import

const setTenantContext = async (req, res, next) => {
  const tenantId = req.header(TENANT_ID_HEADER)

  if (!tenantId) {
    logger.warn("Missing Tenant ID in request header")
    return res.status(400).json({ error: "Tenant ID is required" })
  }

  // Validate tenant ID against a list of known tenants in the database
  try {
    const isValid = await isValidTenant(tenantId) // Here, isValidTenant is supposed to check in the DB

    if (!isValid) {
      logger.warn(`Invalid Tenant ID: ${tenantId}`)
      return res.status(403).json({ error: "Invalid Tenant ID" })
    }

    const tenant = await Tenant.findById(tenantId)

    if (!tenant) {
      logger.warn(`Invalid Tenant ID: ${tenantId}`)
      return res.status(403).json({ error: "Invalid Tenant ID" })
    }

    // Additional checks based on new fields
    if (tenant.status !== "active") {
      logger.warn(`Tenant with ID ${tenantId} is not active.`)
      return res.status(403).json({ error: "Tenant is not active" })
    }

    if (tenant.billingStatus === "suspended") {
      logger.warn(`Tenant with ID ${tenantId} has suspended billing.`)
      return res.status(403).json({ error: "Tenant billing is suspended" })
    }
  } catch (error) {
    logger.error(`Error during tenant validation: ${error}`)
    return res.status(500).json({ error: "Internal Server Error" })
  }

  req.tenantId = tenantId
  next()
}

module.exports = setTenantContext

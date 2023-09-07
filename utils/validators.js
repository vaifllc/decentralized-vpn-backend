const Tenant = require("../models/Tenant") // Import your Tenant model

/**
 * Checks if a given tenant ID is valid
 * @param {String} tenantId - The tenant ID to validate
 * @returns {Boolean} - Whether the tenant ID is valid or not
 */
const isValidTenant = async (tenantId) => {
  try {
    const tenant = await Tenant.findById(tenantId)
    return Boolean(tenant)
  } catch (error) {
    console.error(`Error validating tenant ID: ${error}`)
    return false
  }
}

module.exports = {
  isValidTenant,
}

// utils/createAuditTrail.js

/**
 * Create an audit trail for the performed actions.
 * @param {String} userId - The ID of the user performing the action
 * @param {String} action - The action being performed
 * @param {Object} details - Additional details about the action
 */
const createAuditTrail = (userId, action, details) => {
  const auditTrail = {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
  }

  // Log the audit trail (replace with actual saving logic)
  console.log("Audit Trail:", JSON.stringify(auditTrail))

  // You can also save this to a database or any other persistent storage
}

module.exports = createAuditTrail

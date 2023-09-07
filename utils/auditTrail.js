// auditTrail.js

const createAuditTrail = async (action, data, session) => {
  // Your logic to create an audit trail
  // For example, inserting a new document into an 'AuditTrail' collection

  const newAuditTrailEntry = {
    action,
    data,
    timestamp: new Date(),
    // ... any other fields you want to include
  }

  // If using MongoDB, you could do something like:
  // await AuditTrail.create([newAuditTrailEntry], { session });

  // or use your own logic to store this data
}

module.exports = createAuditTrail

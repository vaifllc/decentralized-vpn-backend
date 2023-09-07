// invoiceValidator.js

const validateInvoiceUpdates = (updates) => {
  if (!updates) {
    return false
  }

  // Validate 'totalAmount' if it exists in updates
  if (
    updates.hasOwnProperty("totalAmount") &&
    (typeof updates.totalAmount !== "number" || updates.totalAmount < 0)
  ) {
    return false
  }

  // Add more validation logic here

  return true
}

module.exports = validateInvoiceUpdates

// validators/nodeValidator.js

/**
 * Validate node input fields.
 * @param {Object} nodeInput - The node fields
 * @returns {Array} - Array of errors (empty if none)
 */
const validateNodeInput = (nodeInput) => {
  const errors = []

  if (!nodeInput.name) {
    errors.push("Name field is required.")
  }

  if (!nodeInput.type) {
    errors.push("Type field is required.")
  }

  // Add more validations here as needed

  return errors
}

module.exports = validateNodeInput

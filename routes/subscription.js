const express = require("express")
const router = express.Router()
const { check, validationResult } = require("express-validator")
const SubscriptionController = require("../controllers/SubscriptionController")

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

// Create subscription
router.post(
  "/create",
  [
    check("pricingId")
      .notEmpty()
      .withMessage("Pricing ID is required")
      .isMongoId()
      .withMessage("Invalid Pricing ID"),
    check("paymentMethod")
      .isIn(["credit_card", "paypal", "other"])
      .withMessage("Invalid payment method"),
  ],
  handleValidationErrors,
  SubscriptionController.createSubscription
)

// Update subscription
router.put(
  "/update/:subscriptionId",
  [
    check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID"),
    check("status")
      .optional()
      .isIn(["active", "inactive", "expired", "cancelled"])
      .withMessage("Invalid status"),
  ],
  handleValidationErrors,
  SubscriptionController.updateSubscription
)

// Pause subscription
router.post(
  "/pause/:subscriptionId",
  [check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID")],
  handleValidationErrors,
  SubscriptionController.pauseSubscription
)

// Resume subscription
router.post(
  "/resume/:subscriptionId",
  [check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID")],
  handleValidationErrors,
  SubscriptionController.resumeSubscription
)

// Cancel subscription
router.delete(
  "/cancel/:subscriptionId",
  [check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID")],
  handleValidationErrors,
  SubscriptionController.cancelSubscription
)

// List all subscriptions for a user
router.get(
  "/list",
  // Add your validation rules here if necessary
  SubscriptionController.listSubscriptions
)

module.exports = router

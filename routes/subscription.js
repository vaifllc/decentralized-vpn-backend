const express = require("express")
const router = express.Router()
const { check, validationResult } = require("express-validator")
const SubscriptionController = require("../controllers/SubscriptionController")
const winston = require("winston")

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    winston.error(`Validation Errors: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Constants for repeated string literals
const INVALID_SUB_ID = "Invalid Subscription ID";
const INVALID_STATUS = "Invalid status";

// Create subscription
router.post(
  "/create",
  [
    check("pricingId").notEmpty().withMessage("Pricing ID is required").isMongoId().withMessage("Invalid Pricing ID"),
    check("paymentMethod").isIn(["credit_card", "paypal", "other"]).withMessage("Invalid payment method"),
  ],
  handleValidationErrors,
  SubscriptionController.createSubscription
);

// Fetch all subscriptions for the logged-in user
router.get("/", SubscriptionController.fetchSubscriptions)

// Update subscription
router.put(
  "/update/:subscriptionId",
  [
    check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID"),
    check("status")
      .optional()
      .isIn(["active", "inactive", "expired", "cancelled"])
      .withMessage("Invalid status"),
    check("newPricingId")
      .optional()
      .isMongoId()
      .withMessage("Invalid new Pricing ID"),
  ],
  handleValidationErrors,
  SubscriptionController.updateSubscription
)

// Pause subscription
router.post(
  "/pause/:subscriptionId",
  [check("subscriptionId").isMongoId().withMessage(INVALID_SUB_ID)],
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

// Renew a subscription
router.post(
  "/renew/:subscriptionId",
  [check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID")],
  handleValidationErrors,
  SubscriptionController.renewSubscription
)

// Get the status of a subscription
router.get(
  "/:subscriptionId/status",
  [check("subscriptionId").isMongoId().withMessage("Invalid Subscription ID")],
  handleValidationErrors,
  SubscriptionController.getSubscriptionStatus
)

module.exports = router

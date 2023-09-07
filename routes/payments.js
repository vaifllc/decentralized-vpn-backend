const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")
const { requireUser, requireAdmin } = require("../middleware/authorization")

// Payment Intents
router.post(
  "/payment-intent",
  requireUser,
  paymentController.createPaymentIntent
)

// Webhook handling for Stripe
router.post("/stripe-webhook", paymentController.handleStripeWebhook)

// Payment History
router.get("/history", requireUser, paymentController.fetchPaymentHistory)

// Refund
router.post("/refund", requireAdmin, paymentController.refundPayment)

// Products
router.get("/products", paymentController.listProducts)
router.put(
  "/products/:productId",
  requireAdmin,
  paymentController.updateProduct
)
router.delete(
  "/products/:productId",
  requireAdmin,
  paymentController.deleteProduct
)

// Subscription
router.post(
  "/subscription/trial",
  requireUser,
  paymentController.createSubscriptionWithTrial
)
router.post(
  "/subscription/pause",
  requireUser,
  paymentController.pauseSubscription
)
router.post(
  "/subscription/resume",
  requireUser,
  paymentController.resumeSubscription
)
router.delete(
  "/subscription/:subscriptionId",
  requireUser,
  paymentController.cancelSubscription
)

module.exports = router

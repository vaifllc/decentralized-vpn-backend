const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")

// Payment Intents
router.post("/payment-intent", paymentController.createPaymentIntent)

// Webhook handling for Stripe
router.post("/stripe-webhook", paymentController.handleStripeWebhook)

// Payment History
router.get("/history", paymentController.fetchPaymentHistory)

// Refund
router.post("/refund", paymentController.refundPayment)

// Products
router.get("/products", paymentController.listProducts)
router.put("/products/:productId", paymentController.updateProduct)
router.delete("/products/:productId", paymentController.deleteProduct)

// Subscription
router.post(
  "/subscription/trial",
  paymentController.createSubscriptionWithTrial
)
router.post("/subscription/pause", paymentController.pauseSubscription)
router.post("/subscription/resume", paymentController.resumeSubscription)
router.delete(
  "/subscription/:subscriptionId",
  paymentController.cancelSubscription
)

module.exports = router

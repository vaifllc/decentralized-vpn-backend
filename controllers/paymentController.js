const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const User = require("../models/User") // Assuming you have a User model
const { sendEmail } = require("../utils/emailService")
const redisClient = require('../config/redis');  // Assuming you have a Redis setup


exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, userId, items } = req.body

    // Validation
    if (!amount || !userId || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Invalid input data." })
    }

    const metadata = {
      userId,
      items: JSON.stringify(items),
      timestamp: new Date().toISOString(), // additional metadata for tracking
    }

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount,
        currency: "usd",
        metadata,
      },
      {
        idempotencyKey: `${userId}-${Date.now()}`, // Ensures this request doesn't get accidentally duplicated
      }
    )

    res.json({
      clientSecret: paymentIntent.client_secret,
    })
  } catch (error) {
    if (error.type === "StripeCardError") {
      // This error occurs when the card has issues, like insufficient funds.
      return res.status(400).json({ error: error.message })
    }
    res
      .status(500)
      .json({ error: `Error creating payment intent: ${error.message}` })
  }
}

// Create a new product
exports.createProduct = async (req, res) => {
  try {
    const { name, description } = req.body

    // Validation
    if (!name || name.length < 3) {
      return res
        .status(400)
        .json({ error: "Product name must be at least 3 characters." })
    }

    if (!description || description.length < 10) {
      return res
        .status(400)
        .json({ error: "Product description must be at least 10 characters." })
    }

    const product = await stripe.products.create({
      name,
      description,
    })

    res.json({
      success: true,
      product,
    })
  } catch (error) {
    if (error.type === "StripeInvalidRequestError") {
      // This error occurs when the Stripe API request is invalid.
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: `Error creating product: ${error.message}` })
  }
}


// Create a price for a product
exports.createPrice = async (req, res) => {
  try {
    const { productId, amount, interval = "month" } = req.body // Default to 'month' if no interval is provided

    // Validation
    if (!productId || !amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "Invalid input data." })
    }

    if (!["day", "week", "month", "year"].includes(interval)) {
      return res
        .status(400)
        .json({
          error: "Invalid interval. Valid options are: day, week, month, year.",
        })
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: "usd",
      recurring: { interval },
    })

    res.json({
      success: true,
      price,
    })
  } catch (error) {
    if (error.type === "StripeInvalidRequestError") {
      // This error occurs when the Stripe API request is invalid.
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: `Error creating price: ${error.message}` })
  }
}


exports.createSubscription = async (req, res) => {
  try {
    const { userId, priceId } = req.body

    // Validation
    if (!userId || !priceId) {
      return res
        .status(400)
        .json({ error: "User ID and Price ID are required." })
    }

    // Check if user is already a Stripe customer
    let existingCustomers = await stripe.customers.list({ email: userId }) // Assuming userId is an email. Otherwise, use metadata: {userId}
    let customer

    if (existingCustomers.data.length) {
      customer = existingCustomers.data[0]
    } else {
      customer = await stripe.customers.create({
        metadata: { userId },
      })
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
    })

    res.json({
      success: true,
      subscription,
    })
  } catch (error) {
    if (error.type === "StripeInvalidRequestError") {
      return res.status(400).json({ error: error.message })
    }
    res
      .status(500)
      .json({ error: `Error creating subscription: ${error.message}` })
  }
}


exports.handleStripeWebhook = async (req, res) => {
  const WEBHOOK_SECRET = "YOUR_WEBHOOK_SECRET" // Retrieve this from environment variables or your config

  let event
  try {
    // Verify the webhook signature for security
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      WEBHOOK_SECRET
    )
  } catch (err) {
    console.error(`Failed to verify Stripe webhook: ${err.message}`)
    return res.status(400).send(`Webhook error: ${err.message}`)
  }

  try {
    // Process the Stripe event
    switch (event.type) {
      case "invoice.paid":
        const invoice = event.data.object
        // Extend the user's VPN access based on the invoice details
        await extendVPNAccess(invoice.customer, invoice.total)
        break

      case "invoice.payment_failed":
        const failedInvoice = event.data.object
        // Notify the user of the failed payment
        await notifyFailedPayment(failedInvoice.customer)
        break

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object
        // Handle the confirmation of the payment, perhaps updating user's balance or access
        await handlePaymentSuccess(paymentIntent.customer, paymentIntent.amount)
        break

      case "payment_intent.payment_failed":
        const failedPaymentIntent = event.data.object
        // Handle payment failures, maybe send a notification or block certain services
        await handlePaymentFailure(failedPaymentIntent.customer)
        break

      // Add other event cases as necessary

      default:
        console.warn(`Unhandled Stripe event type: ${event.type}`)
        break
    }

    res.json({ received: true })
  } catch (error) {
    console.error(`Error processing Stripe event: ${error.message}`)
    res.status(500).json({ error: "Internal Server Error" })
  }
}

async function extendVPNAccess(customerId, totalAmount) {
  const user = await User.findOne({ stripeCustomerId: customerId })
  if (!user) {
    console.error(`User with Stripe customer ID ${customerId} not found.`)
    return
  }

  // Assuming 1 month of access for every $10 paid, as an example.
  const monthsToExtend = Math.floor(totalAmount / 1000)
  user.vpnExpiryDate.setMonth(user.vpnExpiryDate.getMonth() + monthsToExtend)
  await user.save()
}

async function notifyFailedPayment(customerId) {
  const user = await User.findOne({ stripeCustomerId: customerId })
  if (!user) {
    console.error(`User with Stripe customer ID ${customerId} not found.`)
    return
  }

  const emailContent = {
    to: user.email,
    subject: "Payment Failed",
    body: "Your recent payment has failed. Please update your payment method or check your balance.",
  }
  sendEmail(emailContent)
}

async function handlePaymentSuccess(customerId, amount) {
  const user = await User.findOne({ stripeCustomerId: customerId })
  if (!user) {
    console.error(`User with Stripe customer ID ${customerId} not found.`)
    return
  }

  // Update user's account balance or grant access to certain features
  user.balance += amount
  await user.save()

  // Log the successful transaction (if you have a transaction log system in place)
}

async function handlePaymentFailure(customerId) {
  const user = await User.findOne({ stripeCustomerId: customerId })
  if (!user) {
    console.error(`User with Stripe customer ID ${customerId} not found.`)
    return
  }

  // Block or restrict user access
  user.access = "restricted"
  await user.save()

  // Notify an admin or log the failed transaction
}
///////////////////////////////////////////////////

exports.fetchPaymentHistory = async (req, res) => {
  const { userId } = req.query

  if (!userId) {
    return sendErrorResponse(
      res,
      400,
      "UserId is required in query parameters."
    )
  }

  const limit = parseInt(req.query.limit) || 50
  const offset = parseInt(req.query.offset) || 0

  try {
    const payments = await stripe.paymentIntents.list({
      limit,
      starting_after: offset,
      metadata: { userId },
      fields: ["amount", "created", "status", "description"],
    })

    const refinedPayments = refinePaymentData(payments.data)

    return sendSuccessResponse(res, refinedPayments)
  } catch (error) {
    console.error(`Error fetching payment history for user ${userId}:`, error)
    return handleStripeError(res, error)
  }
}

function refinePaymentData(payments) {
  return payments.map((payment) => ({
    amount: payment.amount,
    date: new Date(payment.created * 1000),
    status: payment.status,
    description: payment.description || "N/A",
  }))
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}

exports.refundPayment = async (req, res) => {
  const { paymentIntentId } = req.body

  if (!paymentIntentId) {
    return sendErrorResponse(
      res,
      400,
      "PaymentIntentId is required in the request body."
    )
  }

  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
    })

    const refinedRefund = {
      id: refund.id,
      amount: refund.amount,
      created: new Date(refund.created * 1000),
      status: refund.status,
      reason: refund.reason || "N/A",
    }

    return sendSuccessResponse(res, refinedRefund)
  } catch (error) {
    console.error(
      `Error processing refund for paymentIntent ${paymentIntentId}:`,
      error
    )
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}
///////////////////////////////////////////////////

exports.listProducts = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10
  const offset = parseInt(req.query.offset) || 0

  try {
    const products = await stripe.products.list({
      limit,
      starting_after: offset,
    })

    const refinedProducts = products.data.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description || "N/A",
      active: product.active,
    }))

    return sendSuccessResponse(res, refinedProducts)
  } catch (error) {
    console.error(`Error listing products:`, error)
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}
///////////////////////////////////////////////////

exports.updateProduct = async (req, res) => {
  const { productId, name, description } = req.body

  // Validate inputs
  if (!productId) {
    return sendErrorResponse(
      res,
      400,
      "ProductId is required in the request body."
    )
  }
  if (!name && !description) {
    return sendErrorResponse(
      res,
      400,
      "Either name or description must be provided for updating."
    )
  }

  try {
    const product = await stripe.products.update(productId, {
      name,
      description,
    })

    const refinedProduct = {
      id: product.id,
      name: product.name,
      description: product.description || "N/A",
      active: product.active,
    }

    return sendSuccessResponse(res, refinedProduct)
  } catch (error) {
    console.error(`Error updating product with ID ${productId}:`, error)
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}
///////////////////////////////////////////////////

exports.deleteProduct = async (req, res) => {
  const { productId } = req.body

  // Validate input
  if (!productId) {
    return sendErrorResponse(
      res,
      400,
      "ProductId is required in the request body."
    )
  }

  try {
    await stripe.products.del(productId)
    return sendSuccessResponse(res, {
      message: "Product deleted successfully.",
    })
  } catch (error) {
    console.error(`Error deleting product with ID ${productId}:`, error)
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}
///////////////////////////////////////////////////

exports.createSubscriptionWithTrial = async (req, res) => {
  const { userId, priceId } = req.body
  const trialDays = 14 // 2-week trial

  // Validate inputs
  if (!userId || !priceId) {
    return sendErrorResponse(
      res,
      400,
      "UserId and priceId are required in the request body."
    )
  }

  // Assuming there's a function that maps your system's userId to Stripe's customerId
  const customerId = await mapUserIdToCustomerId(userId)
  if (!customerId) {
    return sendErrorResponse(
      res,
      404,
      "User not found or not linked to a Stripe customer."
    )
  }

  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      trial_period_days: trialDays,
      expand: ["latest_invoice.payment_intent"],
    })

    const refinedSubscription = {
      id: subscription.id,
      items: subscription.items.data,
      status: subscription.status,
      trial_start: subscription.trial_start,
      trial_end: subscription.trial_end,
    }

    return sendSuccessResponse(res, refinedSubscription)
  } catch (error) {
    console.error(
      `Error creating subscription with trial for user ${userId}:`,
      error
    )
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}

async function mapUserIdToCustomerId(userId) {
  try {
    // First, try to get the stripeCustomerId from cache
    const cachedCustomerId = await redisClient.get(`stripe-customer:${userId}`)
    if (cachedCustomerId) {
      return cachedCustomerId
    }

    // If not in cache, fetch from database
    const user = await User.findById(userId, "stripeCustomerId -_id")

    if (!user || !user.stripeCustomerId) {
      return null
    }

    // Cache the result for next time, with a TTL (e.g., 1 hour = 3600 seconds)
    await redisClient.setex(
      `stripe-customer:${userId}`,
      3600,
      user.stripeCustomerId
    )

    return user.stripeCustomerId
  } catch (error) {
    if (error.name === "CastError" && error.kind === "ObjectId") {
      // This is a Mongoose error indicating the userId wasn't a valid MongoDB ObjectId
      console.warn(
        `Invalid userId provided to mapUserIdToCustomerId: ${userId}`
      )
    } else {
      console.error(
        `Error fetching Stripe customerId for user ${userId}:`,
        error
      )
    }
    throw new Error("Internal Server Error")
  }
}

///////////////////////////////////////////////////

exports.pauseSubscription = async (req, res) => {
  const { subscriptionId } = req.body

  // Validate inputs
  if (!subscriptionId) {
    return sendErrorResponse(
      res,
      400,
      "subscriptionId is required in the request body."
    )
  }

  try {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      pause_collection: { behavior: "keep_as_draft" },
    })

    const refinedSubscription = {
      id: subscription.id,
      status: subscription.status,
      pause_collection: subscription.pause_collection,
    }

    return sendSuccessResponse(res, refinedSubscription)
  } catch (error) {
    console.error(`Error pausing subscription ${subscriptionId}:`, error)
    return handleStripeError(res, error)
  }
}

function sendErrorResponse(res, status, message) {
  return res.status(status).json({ success: false, error: message })
}

function sendSuccessResponse(res, data) {
  return res.json({ success: true, data })
}

function handleStripeError(res, error) {
  if (error.type === "StripeInvalidRequestError") {
    return sendErrorResponse(res, 400, error.message)
  } else {
    return sendErrorResponse(
      res,
      500,
      "Internal Server Error. Please try again later."
    )
  }
}
///////////////////////////////////////////////////

exports.resumeSubscription = async (req, res) => {
    const { subscriptionId } = req.body;

    // Validate inputs
    if (!subscriptionId) {
        return sendErrorResponse(res, 400, "subscriptionId is required in the request body.");
    }

    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            pause_collection: null,
        });

        const refinedSubscription = {
            id: subscription.id,
            status: subscription.status,
            pause_collection: subscription.pause_collection
        };

        return sendSuccessResponse(res, refinedSubscription);
    } catch (error) {
        console.error(`Error resuming subscription ${subscriptionId}:`, error);
        return handleStripeError(res, error);
    }
};

// Reusing the helper functions we defined earlier:
// sendErrorResponse, sendSuccessResponse, handleStripeError


exports.cancelSubscription = async (req, res) => {
    const { subscriptionId } = req.body;

    // Validate inputs
    if (!subscriptionId) {
        return sendErrorResponse(res, 400, "subscriptionId is required in the request body.");
    }

    try {
        const canceledSubscription = await stripe.subscriptions.del(subscriptionId);

        const refinedSubscription = {
            id: canceledSubscription.id,
            status: canceledSubscription.status,
            cancel_at_period_end: canceledSubscription.cancel_at_period_end
        };

        return sendSuccessResponse(res, refinedSubscription);
    } catch (error) {
        console.error(`Error canceling subscription ${subscriptionId}:`, error);
        return handleStripeError(res, error);
    }
};

// Reusing the helper functions we defined earlier:
// sendErrorResponse, sendSuccessResponse, handleStripeError


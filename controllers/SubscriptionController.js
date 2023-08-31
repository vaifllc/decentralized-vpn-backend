const Subscription = require("../models/Subscription")
const User = require("../models/User")
const stripe = require("stripe")("YOUR_STRIPE_SECRET_KEY")
const { validationResult } = require("express-validator")
const mongoose = require("mongoose")

const SubscriptionController = {
  createSubscription: async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    try {
      const userId = req.user._id
      const { pricingId, paymentMethod } = req.body

      // Validate user existence
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ error: "User not found" })
      }

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: pricingId }],
        // add other Stripe options here
      })

      // Create a new Subscription document
      const newSubscription = new Subscription({
        userId,
        pricingId,
        paymentMethod,
        stripeSubscriptionId: stripeSubscription.id,
        status: "active",
        // Other fields...
      })

      await newSubscription.save()

      res
        .status(201)
        .json({
          message: "Subscription created successfully",
          subscription: newSubscription,
        })
    } catch (error) {
      console.error(`Error in createSubscription: ${error}`)
      res.status(500).json({ error: error.message })
    }
  },

  // ... other methods with similar structure
}

module.exports = SubscriptionController

const Subscription = require("../models/Subscription")
const User = require("../models/User")
const stripe = require("stripe")("YOUR_STRIPE_SECRET_KEY")
const { validationResult } = require("express-validator")
const mongoose = require("mongoose")
const CustomError = require('../utils/CustomError'); // Assuming you have a CustomError.js file containing the class

const SubscriptionController = {
  createSubscription: async (req, res) => {
    try {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        throw new CustomError("Validation errors", 400, errors.array())
      }

      const userId = req.user._id
      const { pricingId, paymentMethod } = req.body

      const user = await User.findById(userId)
      if (!user) {
        throw new CustomError("User not found", 404)
      }

      // More validations can be here

      const stripeSubscription = await stripe.subscriptions.create({
        customer: user.stripeCustomerId,
        items: [{ price: pricingId }],
      })

      const newSubscription = new Subscription({
        userId,
        pricingId,
        paymentMethod,
        stripeSubscriptionId: stripeSubscription.id,
        status: "active",
      })

      await newSubscription.save()

      res.status(201).json({
        message: "Subscription created successfully",
        subscription: newSubscription,
      })
    } catch (error) {
      console.error(`Error in createSubscription: ${error}`)
      res
        .status(error.status || 500)
        .json({ error: error.message || "Internal Server Error" })
    }
  },

  fetchSubscriptions: async (req, res) => {
    try {
      const userId = req.user._id
      const subscriptions = await Subscription.find({ userId })
      res.status(200).json({ subscriptions })
    } catch (error) {
      console.error(`Error in fetchSubscriptions: ${error}`)
      res.status(500).json({ error: error.message })
    }
  },

  updateSubscription: async (req, res) => {
    try {
      const userId = req.user._id
      const { subscriptionId, newPricingId } = req.body
      const subscription = await Subscription.findOne({
        userId,
        _id: subscriptionId,
      })

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" })
      }

      // Update Stripe subscription
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
        proration_behavior: "create_proration",
        items: [
          {
            id: subscription.stripeSubscriptionItemId,
            price: newPricingId,
          },
        ],
      })

      // Update local database
      subscription.pricingId = newPricingId
      await subscription.save()

      res.status(200).json({ message: "Subscription updated successfully" })
    } catch (error) {
      console.error(`Error in updateSubscription: ${error}`)
      res.status(500).json({ error: error.message })
    }
  },

  cancelSubscription: async (req, res) => {
    try {
      const userId = req.user._id
      const { subscriptionId } = req.body
      const subscription = await Subscription.findOne({
        userId,
        _id: subscriptionId,
      })

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" })
      }

      // Cancel Stripe subscription
      await stripe.subscriptions.del(subscription.stripeSubscriptionId)

      // Update local database
      subscription.status = "canceled"
      await subscription.save()

      res.status(200).json({ message: "Subscription canceled successfully" })
    } catch (error) {
      console.error(`Error in cancelSubscription: ${error}`)
      res.status(500).json({ error: error.message })
    }
  },

  renewSubscription: async (req, res) => {
    // Similar structure to `createSubscription`
    // Your logic here
  },

  getSubscriptionStatus: async (req, res) => {
    try {
      const userId = req.user._id
      const { subscriptionId } = req.params
      const subscription = await Subscription.findOne({
        userId,
        _id: subscriptionId,
      })

      if (!subscription) {
        return res.status(404).json({ error: "Subscription not found" })
      }

      res.status(200).json({ status: subscription.status })
    } catch (error) {
      console.error(`Error in getSubscriptionStatus: ${error}`)
      res.status(500).json({ error: error.message })
    }
  },
}


module.exports = SubscriptionController

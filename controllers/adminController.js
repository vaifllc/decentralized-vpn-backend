const User = require("../models/User")
const VPN = require("../models/Server")
const Payment = require("../models/Payment") // Assuming you have a Payment model
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const Pricing = require('../models/Pricing'); // Assuming you have a Pricing model
const compute = require("@google-cloud/compute")
//const compute = new Compute()
const monitoring = require("@google-cloud/monitoring")
const client = new monitoring.MetricServiceClient()
const fs = require("fs") // For file operations

// List All Users
exports.listUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.registrationDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      }
    }
    if (req.query.subscriptionStatus) {
      filter.subscriptionStatus = req.query.subscriptionStatus
    }

    const sort = {}
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.order === "desc" ? -1 : 1
    } else {
      sort.createdAt = -1 // Default sorting
    }

    const users = await User.find(filter, "-password -_id -__v") // Excluding sensitive and unnecessary fields
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const totalUsers = await User.countDocuments(filter)

    res.json({
      data: users,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers: totalUsers,
    })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid query parameter." })
    }
    res.status(500).json({ error: `Error fetching users: ${error.message}` })
  }
}


// View Details of a Specific User
exports.viewUser = async (req, res) => {
  try {
    const user = await User.findById(
      req.params.userId,
      "-password -__v -sensitiveField1 -sensitiveField2"
    )
      .populate("transactions", "-_id -__v")
      .populate("subscription", "-_id -__v")

    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }

    // 1. Extended User Profile
    user.lastLogin = await getLastLoginDate(user._id) // Example function to get the last login date
    user.totalSpent = await computeTotalSpent(user._id) // Example function to compute total spending

    // 2. Aggregate Data
    // (Assuming you have a UserActivity collection storing each user's sessions)
    const userActivityStats = await UserActivity.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: "$userId",
          totalSessionTime: { $sum: "$sessionLength" },
          averageSession: { $avg: "$sessionLength" },
        },
      },
    ])

    if (userActivityStats.length) {
      user.activityStats = userActivityStats[0]
    }

    res.json(user)
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID format." })
    }
    res
      .status(500)
      .json({ error: `Error fetching user details: ${error.message}` })
  }
}

// Sample function to get the last login date for a user
async function getLastLoginDate(userId) {
  // Fetch the date from your database or logs
  return new Date() // Placeholder
}

// Sample function to compute a user's total spending
async function computeTotalSpent(userId) {
  // Use your transaction or subscription data to compute this
  return 100 // Placeholder
}


// Update User Details
exports.updateUser = async (req, res) => {
  try {
    // 1. Validation
    const allowedUpdates = ["name", "email", "subscriptionStatus"] // Example fields
    const updates = Object.keys(req.body)
    const isValidUpdate = updates.every((update) =>
      allowedUpdates.includes(update)
    )

    if (!isValidUpdate) {
      return res.status(400).json({ error: "Invalid updates!" })
    }

    // 2. Fine-grained Updates
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }

    updates.forEach((update) => (user[update] = req.body[update]))
    await user.save()

    // 3. Data Masking
    user.password = undefined // Ensuring password is not returned

    // 4. Logging
    console.log(
      `User ${req.user.id} updated user ${
        req.params.userId
      } at ${new Date().toISOString()}`
    )

    res.json(user)
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID format." })
    }
    res.status(500).json({ error: `Error updating user: ${error.message}` })
  }
}


// Delete a User

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ error: "User not found." })
    }

    // 1. Backup
    await backupUserData(user)

    // 2. Notifications
    await notifyUserOfDeletion(user.email)

    // 3. Revoke Access
    user.isActive = false

    // 4. Data Cleanup
    await cleanupUserData(user._id)

    // 5. Admin Approval
    user.deletionPendingApproval = true

    user.isDeleted = true
    await user.save()

    // Logging
    console.log(
      `User ${req.user.id} deleted user ${
        req.params.userId
      } at ${new Date().toISOString()}`
    )

    res.json({ message: "User deletion initiated. Awaiting approval." })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid user ID format." })
    }
    res.status(500).json({ error: `Error deleting user: ${error.message}` })
  }
}

// Backup user's data to a JSON file
async function backupUserData(user) {
  const backupData = JSON.stringify(user)
  const backupPath = `./backups/user_${user._id}_${Date.now()}.json`
  fs.writeFileSync(backupPath, backupData)
}

// Send notifications to the user about their account deletion
async function notifyUserOfDeletion(email) {
  // Placeholder: Integrate with your email sending service
  console.log(`Notification sent to ${email} about account deletion.`)
}

// Cleanup temporary user data
async function cleanupUserData(userId) {
  // Placeholder: Depending on your application, remove or archive temporary data related to the user
  console.log(`Temporary data cleaned up for user ${userId}.`)
}


// View VPN Server Logs
exports.viewServerLogs = async (req, res) => {
  try {
    const server = await VPN.findById(req.params.serverId)
    if (!server) {
      return res.status(404).json({ error: "Server not found." })
    }

    // 1. Pagination
    const page = req.query.page || 1
    const limit = req.query.limit || 50
    const skip = (page - 1) * limit

    // 2. Filtering
    let filters = {}
    if (req.query.severity) {
      filters.severity = req.query.severity
    }

    // 3. Log Aggregation (placeholder)
    // If using an external logging system, fetch logs from there

    // 4. Time Range
    if (req.query.startDate) {
      filters.date = { $gte: new Date(req.query.startDate) }
    }
    if (req.query.endDate) {
      if (filters.date) {
        filters.date.$lte = new Date(req.query.endDate)
      } else {
        filters.date = { $lte: new Date(req.query.endDate) }
      }
    }

    const logs = server.logs
      .filter((log) => {
        for (let key in filters) {
          if (log[key] !== filters[key]) {
            return false
          }
        }
        return true
      })
      .slice(skip, skip + limit)

    res.json(logs)
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid server ID format." })
    }
    res
      .status(500)
      .json({ error: `Error fetching server logs: ${error.message}` })
  }
}


// Restarting or Shutting Down a Server (Stubbed out for illustration. Actual implementation depends on your infrastructure)

exports.controlServer = async (req, res) => {
  try {
    const action = req.body.action
    const serverId = req.params.serverId

    const zone = compute.zone("YOUR_ZONE")
    const vm = zone.vm(serverId)

    // Fetch the VM's metadata, which includes its current status
    const [metadata] = await vm.getMetadata()
    const currentStatus = metadata.status

    if (action === "restart" && currentStatus !== "TERMINATED") {
      await vm.reset()
    } else if (action === "shutdown" && currentStatus !== "TERMINATED") {
      await vm.stop()
    } else if (action === "start" && currentStatus === "TERMINATED") {
      await vm.start()
    } else {
      return res
        .status(400)
        .json({
          error: `Invalid action or VM is already in the desired state.`,
        })
    }

    // Logging (just console for now, but consider integrating with a logging system)
    console.log(
      `User ${
        req.user.id
      } initiated ${action} on server ${serverId} at ${new Date().toISOString()}`
    )

    res.json({ message: `Server ${action} initiated.` })
  } catch (error) {
    if (error.code === 404) {
      return res.status(404).json({ error: "VM not found." })
    }
    if (error.code === 403) {
      return res.status(403).json({ error: "Insufficient permissions." })
    }
    // Handle other specific error codes as needed
    res
      .status(500)
      .json({ error: `Error initiating ${action} on server: ${error.message}` })
  }
}



// Analytics about Server Usage (Stubbed out. Actual implementation will depend on how you're collecting metrics)
exports.viewServerMetrics = async (req, res) => {
  try {
    const serverId = req.params.serverId
    const timeframe = req.query.timeframe || 3600 // Default to the last hour

    const metricTypes = [
      "compute.googleapis.com/instance/cpu/utilization",
      "compute.googleapis.com/instance/network/received_bytes_count",
      "compute.googleapis.com/instance/network/sent_bytes_count",
      // Add more metrics as needed
    ]

    const metricsData = await Promise.all(
      metricTypes.map(async (metricType) => {
        const [timeSeries] = await client.listTimeSeries({
          name: client.projectPath("YOUR_PROJECT_ID"),
          filter: `metric.type="${metricType}" AND resource.label.instance_id="${serverId}"`,
          interval: {
            startTime: {
              seconds: Date.now() / 1000 - timeframe,
            },
            endTime: {
              seconds: Date.now() / 1000,
            },
          },
          view: monitoring.ListTimeSeriesRequest.TimeSeriesView.FULL,
        })

        return {
          metricType: metricType,
          values: timeSeries.map((data) => ({
            timestamp: data.interval.endTime.seconds,
            value: data.points[0].value.doubleValue,
          })),
        }
      })
    )

    res.json(metricsData)
  } catch (error) {
    if (error.code === 404) {
      return res
        .status(404)
        .json({ error: "Metric not found or server not found." })
    }
    if (error.code === 403) {
      return res.status(403).json({ error: "Insufficient permissions." })
    }
    // Handle other specific error codes as needed
    res
      .status(500)
      .json({ error: `Error fetching server metrics: ${error.message}` })
  }
}



// View All Transactions
exports.listTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.status) {
      filter.status = req.query.status
    }
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate),
      }
    }
    if (req.query.userId) {
      filter.userId = req.query.userId
    }
    if (req.query.minAmount && req.query.maxAmount) {
      filter.amount = {
        $gte: parseFloat(req.query.minAmount),
        $lte: parseFloat(req.query.maxAmount),
      }
    }
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod
    }

    const sort = {}
    if (req.query.sortBy) {
      sort[req.query.sortBy] = req.query.order === "desc" ? -1 : 1
    } else {
      sort.createdAt = -1 // Default sorting
    }

    const transactions = await Payment.find(filter, "-_id -__v") // Excluding certain fields
      .populate("userId", "name email") // Example of populate, assumes userId is a reference
      .sort(sort)
      .skip(skip)
      .limit(limit)

    const totalTransactions = await Payment.countDocuments(filter)

    res.json({
      data: transactions,
      page: page,
      limit: limit,
      totalPages: Math.ceil(totalTransactions / limit),
      totalTransactions: totalTransactions,
    })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid query parameter." })
    }
    res
      .status(500)
      .json({ error: `Error fetching transactions: ${error.message}` })
  }
}


// View Details of a Specific Transaction
exports.viewTransaction = async (req, res) => {
  try {
    const transaction = await Payment.findById(
      req.params.transactionId,
      "-_id -__v"
    ).populate("userId", "name email") // Assuming the Payment schema has a reference to the User schema

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found." })
    }

    res.json(transaction)
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ error: "Invalid transaction ID format." })
    }
    res
      .status(500)
      .json({ error: `Error fetching transaction details: ${error.message}` })
  }
}


// Refund a Transaction
// Refund a Transaction with partial refund capability and logging
exports.refundTransaction = async (req, res) => {
    try {
        const payment = await Payment.findById(req.params.transactionId);
        if (!payment) {
            return res.status(404).json({ error: 'Transaction not found.' });
        }

        const refundAmount = req.body.amount || payment.amount; // If no amount specified, refund the full amount

        const refund = await stripe.refunds.create({
            charge: payment.chargeId,
            amount: refundAmount
        });

        // Log the refund details
        payment.refunded = true;
        payment.refundDetails = {
            admin: req.user.id, // Assuming req.user contains logged-in admin details
            reason: req.body.reason,
            date: new Date(),
            amount: refundAmount
        };
        await payment.save();

        res.json({ message: 'Refund initiated.', refund });
    } catch (error) {
        res.status(500).json({ error: 'Error initiating refund.' });
    }
};


// Update Pricing Details (This is a stub. Actual implementation would depend on how you're storing pricing data)
// Update Pricing Details with history
exports.updatePricing = async (req, res) => {
  try {
    // 1. Validation
    if (
      !req.body.price ||
      typeof req.body.price !== "number" ||
      req.body.price < 0
    ) {
      return res.status(400).json({ error: "Invalid pricing data provided." })
    }

    // 2. Versioning
    const previousPricing = await Pricing.find({})
      .sort({ createdAt: -1 })
      .limit(1)
    if (previousPricing && previousPricing.price === req.body.price) {
      return res.status(400).json({ message: "No change in pricing." })
    }

    const newPricing = new Pricing(req.body)
    await newPricing.save()

    // 3. Logging
    console.log(
      `User ${req.user.id} updated pricing to ${
        newPricing.price
      } at ${new Date().toISOString()}`
    )

    // 4. Optional: Notify users of pricing change
    // You can integrate with your notification system here

    res.json({ message: "Pricing updated successfully." })
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({ error: "Invalid pricing data." })
    }
    res.status(500).json({ error: `Error updating pricing: ${error.message}` })
  }
}


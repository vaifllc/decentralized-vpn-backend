const mongoose = require("mongoose")
const Pricing = require("../models/Pricing") // Path to your Pricing model

mongoose.connect(
  "mongodb+srv://mahabbit:Hjs6fXSgGWfrcUKZ@vr2-centralized.9xdjpjy.mongodb.net/",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)

const pricingData = [
  {
    planName: "Starter Plan",
    monthlyPrice: 0,
    yearlyPrice: 0,
    twoYearlyPrice: 0,
    features: [
      "Access to basic servers",
      "256-bit encryption",
      "Limited speed",
    ],
    maxDevices: 1,
    dataLimit: "Limited",
    planType: "Individual",
    maxUsers: 1,
  },
  {
    planName: "ProSecure Plan",
    monthlyPrice: 12.25,
    yearlyPrice: 68.5,
    twoYearlyPrice: 118.5,
    features: [
      "Access to premium servers",
      "Up to 5 devices",
      "Medium speed",
      "No ads",
      "256-bit encryption",
      "Kill switch",
    ],
    maxDevices: 5,
    dataLimit: "Unlimited",
    planType: "Individual",
    maxUsers: 1,
  },
  {
    planName: "EliteGuard Plan",
    monthlyPrice: 18.5,
    yearlyPrice: 131,
    twoYearlyPrice: 231,
    features: [
      "Access to all servers",
      "Up to 8 devices",
      "high-speed",
      "No ads",
      "256-bit encryption",
      "Multi-Protocol",
      "Kill switch",
    ],
    maxDevices: 8,
    dataLimit: "Unlimited",
    planType: "Individual",
    maxUsers: 1,
  },
  {
    planName: "Family Plan",
    monthlyPrice: 25,
    yearlyPrice: 250,
    twoYearlyPrice: 450,
    features: [
      "Access to all servers",
      "Up to 8 devices",
      "High-speed",
      "No ads",
      "256-bit encryption",
      "Multi-Protocol",
      "Kill switch",
    ],
    maxDevices: 8,
    dataLimit: "Unlimited",
    planType: "Family",
    maxUsers: 5,
  },
  {
    planName: "BusinessMax Plan",
    monthlyPrice: 40,
    yearlyPrice: 380,
    twoYearlyPrice: 680,
    features: [
      "Customized for businesses",
      "Priority support",
      "Additional security features",
      "Admin dashboard",
    ],
    maxDevices: 24,
    dataLimit: "Unlimited",
    planType: "Business",
    maxUsers: 10,
  },
  // Add other plans here...
]


Pricing.insertMany(pricingData)
  .then(() => {
    console.log("Data inserted successfully")
    mongoose.connection.close()
  })
  .catch((error) => {
    console.log("Error inserting data: ", error)
  })

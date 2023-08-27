const mongoose = require("mongoose")
const AddOn = require("../models/AddOn") // Path to your AddOn model

mongoose.connect("mongodb+srv://mahabbit:Hjs6fXSgGWfrcUKZ@vr2-centralized.9xdjpjy.mongodb.net/", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})

const addOnData = [
  {
    name: "Dedicated IP",
    price: 6.25,
    description: "Get your own dedicated IP address",
  },
  {
    name: "Additional Device Support",
    price: 3.75,
    description: "Add support for more devices",
  },
  // Add other add-ons here...
]

AddOn.insertMany(addOnData)
  .then(() => {
    console.log("Add-On data inserted successfully")
    mongoose.connection.close()
  })
  .catch((error) => {
    console.log("Error inserting Add-On data: ", error)
  })

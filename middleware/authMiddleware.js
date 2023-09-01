const jwt = require("jsonwebtoken")
require("dotenv").config()

const checkToken = (req, res, next) => {
  const token =
    req.headers["authorization"] && req.headers["authorization"].split(" ")[1]
  if (!token) {
    return res.status(401).json({ message: "No token provided" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" })
    }
    console.log("Payload:", payload)
    req.user = payload // You can attach the payload to req object
    next()
  })
}

module.exports = {
  checkToken,
}

const jwt = require("jsonwebtoken")
const config = require("../config")

const jwtMiddleware = (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "No token provided." })
  }

  try {
    const decodedToken = jwt.verify(token, config.JWT_SECRET)
    req.user = decodedToken
    next()
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid or expired token." })
    }
    return res
      .status(500)
      .json({ error: "Server error. Please try again later." })
  }
}

module.exports = jwtMiddleware

var express = require("express")
var path = require("path")
var cookieParser = require("cookie-parser")
const cors = require("cors")
require("dotenv").config()

var indexRouter = require("./routes/index")
var usersRouter = require("./routes/users")

var app = express()

const connectDB = require("./config/db")
const redisClient = require("./config/redis")
const winston = require("winston")
const morgan = require("morgan")
const swaggerUi = require("swagger-ui-express")
const swaggerSpecs = require("./config/swagger")
const rateLimit = require("express-rate-limit")
const adminRoutes = require("./routes/adminRoutes")
const addOnRoutes = require("./routes/addOnRoutes")
const helmet = require("helmet")
const sessionRoutes = require("./routes/sessionRoutes")

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
})

// Connect to MongoDB
connectDB()

// Middleware setup
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, "public")))

const allowedOrigins = process.env.CORS_ORIGIN.split(",").concat([
  process.env.CORS_ORIGIN_URL,
])

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true)
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          "The CORS policy for this site does not allow access from the specified Origin."
        return callback(new Error(msg), false)
      }
      return callback(null, true)
    },
  })
)

const jwtMiddleware = (req, res, next) => {
  const token =
    req.headers.authorization && req.headers.authorization.split(" ")[1]

  if (!token) {
    return res.status(401).json({
      error: "No token provided.",
    })
  }

  try {
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decodedToken
    next()
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Invalid or expired token.",
      })
    }

    return res.status(500).json({
      error: "Server error. Please try again later.",
    })
  }
}

// Use this middleware for protected routes
//app.use("/protected-route", jwtMiddleware, protectedRouteHandler)

app.use(limiter)
app.use(morgan("combined"))

app.use("/", indexRouter)
app.use("/users", usersRouter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs))
app.use("/admin", adminRoutes)
app.use("/addons", addOnRoutes)
app.use("/api/sessions", sessionRoutes)


// Winston for general logging
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
console.log("JWT_SECRET:", process.env.JWT_SECRET)

module.exports = app

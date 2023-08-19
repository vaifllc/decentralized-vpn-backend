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
const helmet = require("helmet")

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

const allowedOrigins = [process.env.CORS_ORIGIN, process.env.CORS_ORIGIN_URL]
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

app.use(limiter)
app.use(morgan("combined"))

app.use("/", indexRouter)
app.use("/users", usersRouter)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs))
app.use("/admin", adminRoutes)

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

module.exports = app

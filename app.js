const express = require("express")
const path = require("path")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const morgan = require("morgan")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const swaggerUi = require("swagger-ui-express")
const winston = require("winston")
const config = require("./config") // New import for configuration


// Import routes
const indexRouter = require("./routes/index")
const usersRouter = require("./routes/users")
const adminRoutes = require("./routes/adminRoutes")
const addOnRoutes = require("./routes/addOnRoutes")
const sessionRoutes = require("./routes/sessionRoutes")
const configRoutes = require("./routes/configRoutes")

// Import middlewares
const { connectDB, initialConnectDB } = require("./config/db")
const setTenantContext = require("./middleware/setTenantContext")
const centralizedErrorHandling = require("./utils/centralized-error-handling")
const jwtMiddleware = require("./middleware/jwtMiddleware") // Assuming you have this middleware

// Import services
const AutoScalingService = require("./healthChecks/AutoScallingService")
const HealthCheckService = require("./healthChecks/HealthCheckService") // Assuming you have this service

// Initialize app
const app = express()

const swaggerSpecs = require("./config/swagger")

// Connect to MongoDB
//connectDB()
initialConnectDB()

// Middlewares
app.use(helmet()) // Security headers
app.use(morgan("combined")) // HTTP request logging
app.use(express.json()) // Parse JSON request body
app.use(express.urlencoded({ extended: false })) // Parse URL-encoded request body
app.use(cookieParser()) // Parse cookies
app.use(express.static(path.join(__dirname, "public"))) // Serve static files

// CORS setup
const allowedOrigins = config.CORS_ALLOWED_ORIGINS
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      callback(new Error("Not allowed by CORS"))
    },
  })
)

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
})
app.use("/api/", limiter)

// API Routes
app.use("/api/v1/", jwtMiddleware, setTenantContext, connectDB)
app.use("/api/v1/", indexRouter)
app.use("/api/v1/users", usersRouter)
app.use("/api/v1/admin", adminRoutes)
app.use("/api/v1/addons", addOnRoutes)
app.use("/api/v1/sessions", sessionRoutes)
app.use("/api/v1/config", configRoutes)

// Swagger UI
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs))

// Error handling
app.use(centralizedErrorHandling)

// Tenant context
//app.use(setTenantContext)

// Periodic tasks
setInterval(HealthCheckService.run, 60000)
setInterval(AutoScalingService.autoScale, 5 * 60 * 1000)

const PORT = config.PORT || 3000
app.listen(PORT, () => winston.info(`Server started on port ${PORT}`))

module.exports = app

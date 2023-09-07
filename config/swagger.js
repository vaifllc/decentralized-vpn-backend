const swaggerJsdoc = require("swagger-jsdoc")

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "VPN Backend API",
      version: "1.0.0",
      description: "API for a decentralized VPN service",
    },
    servers: [
      {
        url: process.env.API_URL || "https://api.vpn.vaifr2.net:3000", // Environment specific
      },
    ],
    components: {
      securitySchemes: {
        Bearer: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // Files with annotations for swagger-jsdoc
}

const specs = swaggerJsdoc(options)

module.exports = specs

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
        url: "http://localhost:3000",
      },
    ],
  },
  apis: ["./routes/*.js"], // Files with annotations for swagger-jsdoc
}

const specs = swaggerJsdoc(options)

module.exports = specs

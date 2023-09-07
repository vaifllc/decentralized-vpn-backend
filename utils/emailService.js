const nodemailer = require("nodemailer")
const winston = require("winston") // Assume you've set up Winston elsewhere in your code

// Configuration options for your email service
const emailConfig = {
  host: process.env.SMTP_HOST || "YOUR_SMTP_HOST",
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE || false,
  user: process.env.SMTP_USER || "YOUR_EMAIL",
  pass: process.env.SMTP_PASS || "YOUR_EMAIL_PASSWORD",
}

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass,
  },
})

async function sendEmail({ to, subject, body }) {
  try {
    let info = await transporter.sendMail({
      from: `"Your Company" <${emailConfig.user}>`, // sender address
      to: to,
      subject: subject,
      text: body, // plain text body
      // html: "<b>Hello world?</b>" // html body (if you prefer)
    })

    winston.info(`Email sent: ${info.messageId}`) // Logging with Winston
  } catch (error) {
    winston.error(`Error sending email: ${error}`) // Logging with Winston
  }
}

module.exports = {
  sendEmail,
}

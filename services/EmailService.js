require("dotenv").config()
const nodemailer = require("nodemailer")
const logger = require("../utils/logger") // Assuming you have a logger

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST, // Using environment variables
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE || false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail({ to, subject, body, html }) {
    try {
      const mailOptions = {
        from:
          process.env.EMAIL_FROM || '"Your Company" <yourcompany@example.com>', // sender address
        to: to,
        subject: subject,
        text: body,
        html: html || null,
      }
      const info = await this.transporter.sendMail(mailOptions)
      logger.info(`Email sent: ${info.messageId}`)
    } catch (error) {
      logger.error(`Error in sendEmail: ${error}`)
      throw error
    }
  }

  async sendWelcomeEmail(to) {
    const subject = "Welcome to Our Service"
    const body = "Thank you for registering. We are happy to have you on board."
    await this.sendEmail({ to, subject, body })
  }

  async sendPasswordResetEmail(to, resetLink) {
    const subject = "Password Reset Request"
    const body = `To reset your password, click the following link: ${resetLink}`
    await this.sendEmail({ to, subject, body })
  }

  async sendAlertEmail(to, alertMessage) {
    const subject = "Alert: Important Notification"
    const body = `Attention: ${alertMessage}`
    await this.sendEmail({ to, subject, body })
  }

  // Add more email types as methods here
}

module.exports = new EmailService()

const nodemailer = require("nodemailer")

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: "YOUR_SMTP_HOST", // e.g., smtp.mailtrap.io for Mailtrap
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "YOUR_EMAIL",
    pass: "YOUR_EMAIL_PASSWORD",
  },
})

async function sendEmail({ to, subject, body }) {
  try {
    let info = await transporter.sendMail({
      from: '"Your Company" <yourcompany@example.com>', // sender address
      to: to,
      subject: subject,
      text: body, // plain text body
      // html: "<b>Hello world?</b>" // html body (if you prefer)
    })

    console.log("Message sent: %s", info.messageId)
  } catch (error) {
    console.error("Error sending email:", error)
  }
}

module.exports = {
  sendEmail,
}

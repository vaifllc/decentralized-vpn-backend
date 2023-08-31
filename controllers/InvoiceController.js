const User = require("./models/User")
const Subscription = require("../models/Subscription")
const Invoice = require("../models/Invoice")
const AddOn = require("../models/AddOn")
const nodemailer = require("nodemailer")



// Your email sending function could look something like this
const sendEmail = async (to, subject, text) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',  // replace with your email service
      auth: {
        user: 'youremail@gmail.com',  // replace with your email
        pass: 'yourpassword'  // replace with your password
      }
    });

    const mailOptions = {
      from: 'youremail@gmail.com',  // replace with your email
      to: to,
      subject: subject,
      text: text
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
  }
};



const generateInvoice = async (userId, subscriptionId, addOnIds = []) => {
  try {
    const user = await User.findById(userId)
    const subscription = await Subscription.findById(subscriptionId)
    const addOns = await AddOn.find({ _id: { $in: addOnIds } })

    if (!user || !subscription || addOns.length !== addOnIds.length) {
      throw new Error("Invalid userId, subscriptionId, or addOnIds")
    }

    // Calculate total amount
    let totalAmount = subscription.price
    addOns.forEach((addOn) => {
      totalAmount += addOn.price
    })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 7) // Due in 7 days

    const newInvoice = new Invoice({
      userId,
      subscriptionId,
      addOns: addOnIds,
      totalAmount,
      dueDate,
      paymentStatus: "Due",
    })

    await newInvoice.save()

    // Send email to the user about the new invoice (Assuming sendEmail is a function you've defined)
    // sendEmail(user.email, 'New Invoice Generated', `Total amount: ${totalAmount}`);
  } catch (error) {
    console.error("Error generating invoice:", error)
    // Handle the error appropriately
  }
}


const updateInvoice = async (invoiceId, updates) => {
  try {
    const invoice = await Invoice.findById(invoiceId)

    if (!invoice) {
      throw new Error("Invoice not found")
    }

    // Validate updates (You'll need to define your own validateInvoiceUpdates function)
    // const isValid = validateInvoiceUpdates(updates);

    // if (!isValid) {
    //   throw new Error("Invalid updates");
    // }

    Object.assign(invoice, updates)

    await invoice.save()
  } catch (error) {
    console.error("Error updating invoice:", error)
    // Handle the error appropriately
  }
}

const markInvoiceAsPaid = async (invoiceId, paidAmount) => {
  try {
    await updateInvoice(invoiceId, {
      paymentStatus: "Paid",
      paidAmount,
      paidAt: new Date(),
    })
  } catch (error) {
    console.error("Error marking invoice as paid:", error)
    // Handle the error appropriately
  }
}

const checkOverdueInvoices = async () => {
  try {
    const overdueInvoices = await Invoice.find({
      paymentStatus: "Due",
      dueDate: { $lt: new Date() },
    })

    for (let invoice of overdueInvoices) {
      invoice.paymentStatus = "Overdue"
      await invoice.save()
    }
  } catch (error) {
    console.error("Error checking overdue invoices:", error)
    // Handle the error appropriately
  }
}


module.exports = {
  generateInvoice,
  updateInvoice,
  markInvoiceAsPaid,
  checkOverdueInvoices,
  // ... (your other exports)
}
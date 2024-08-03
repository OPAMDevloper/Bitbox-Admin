const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const pdf = require('html-pdf');
const os = require('os');
const router = express();

const Warranty = require('../models/Warranty');
const Reseller = require('../models/Reseller'); 
const SerialNumber = require('../models/Serial');
const Certificate = require('../models/Certificate'); 
const WarrantyClaim = require('../models/WarrantyClaim');
const EmailTemplate = require('../models/Emailtemplate');
const StatusInfo = require('../models/StatusInfo');
const { log } = require('console');


// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
// Multer file filter to accept only PDFs and EXEs
const fileFilter = (req, file, cb) => {
    // Regular expression to test file extensions
    const allowedTypes = /pdf|exe/;
    // Check MIME type
    const mimetype = allowedTypes.test(file.mimetype);
    // Check file extension
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: File upload only supports PDF and EXE files!'), false);
    }
};
// Initialize multer with storage and file filter
const upload = multer({
    storage: storage
});


//Mail Sending Credentials
const transporter = nodemailer.createTransport({
    host: "radiant.icewarpcloud.in",
    port: 465,
    secure: true, // Use true for port 465, false for all other ports
    auth: {
      user: "alerts@bitboxpc.com",
      pass: "Hello@123",
    },
});


router.get('/', async (req, res) => {
    try {
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('TicketManagement', { loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});
router.get('/modify-status', async (req, res) => {
    try {
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('Ticket/ModifyStatus', { loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});
router.get('/add-status', async (req, res) => {
    try {
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('Ticket/AddStatus', { loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});
router.get('/open-ticket', async (req, res) => {
    try {
        const loggedIN = true;
        const { username, accessTo } = req.session.user;
        const tickets = await WarrantyClaim.find({ status: { $ne: 'Resolved' } });
        res.render('Ticket/OpenTicket', { loggedIN, accessTo, tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).send('Server error');
    }
});

router.get('/closed-ticket', async (req, res) => {
    try {
        const loggedIN = true;
        const { username, accessTo } = req.session.user;
        const tickets = await WarrantyClaim.find({ status: 'Resolved' });
        res.render('Ticket/ClosedTickets', { loggedIN, accessTo, tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).send('Server error');
    }
});

router.get('/add-ticket', async (req, res) => {
    try {
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('Ticket/AddTicket', { loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});










router.post('/addStatus', async (req, res) => {
    try {
        const { status } = req.body;

        // Check if status already exists
        const existingStatus = await StatusInfo.findOne({ status });
        if (existingStatus) {
            return res.status(400).json({ message: 'Status already exists' });
        }

        // Create and save new status
        const newStatus = new StatusInfo({ status });
        await newStatus.save();

        res.status(201).json(newStatus);
    } catch (err) {
        console.error('Error adding status:', err);
        res.status(500).json({ message: err.message });
    }
});


// Get available status options
router.get('/statusOptions', async (req, res) => {
    try {
        const statusOptions = await StatusInfo.find({});
        res.json(statusOptions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/ticketsAdd', async (req, res) => {
    try {
        const { certificateId, phoneNumber, emailId, serialNumber, message } = req.body;

        // Check if the certificate exists
        const certificateExists = await Certificate.exists({ serialNumber });
        console.log(certificateExists);

        if (!certificateExists) {
            return res.status(400).send({ message: 'Serial Number does not exist' });
        }

        // Check if there is an unresolved warranty claim for the serial number
        const unresolvedClaimExists = await WarrantyClaim.exists({ serialNumber, status: { $ne: 'Resolved' } });
        console.log(unresolvedClaimExists);

        if (unresolvedClaimExists) {
            return res.status(400).send({ message: 'A warranty claim has already been submitted and is currently unresolved' });
        }

        // Create and save the warranty claim
        const warrantyClaim = new WarrantyClaim({
            certificateId,
            phoneNumber,
            emailId,
            serialNumber,
            message,
            status: 'submitted' // Set initial status to 'Pending'
        });

        await warrantyClaim.save();

        // Send email
        async function sendMail() {
            try {
                const info = await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${emailId}>`,
                    subject: "Warranty Claim Submitted",
                    text: `Dear Bitbox PC User,

Your Warranty Claim for Serial Number ${serialNumber} with Reference to Certificate ID ${certificateId} has been submitted successfully. We'll convey further updates to your email.

If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com.

Regards,
Team Bitbox
Toll Free: 1800309PATA
eMail: support@bitboxpc.com
web: www.bitboxpc.com`,
                    html: `<p>Dear Bitbox PC User,</p>
<p>Your Warranty Claim for Serial Number <strong>${serialNumber}</strong> with Reference to Certificate ID <strong>${certificateId}</strong> has been submitted successfully. We'll convey further updates to your email.</p>
<p>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a>.</p>
<p>Regards,<br>
Team Bitbox<br>
Toll Free: 1800309PATA<br>
eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a><br>
web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a></p>`
                });
                console.log('Email sent: ' + info.response);
            } catch (mailError) {
                console.error('Error sending email:', mailError);
                throw mailError; // Re-throw to be caught in the outer catch block
            }
        }

        await sendMail();
        res.render('Ticket/AddTicket');

    } catch (error) {
        console.error('Error submitting warranty claim:', error);
        res.status(500).send({ message: 'Error submitting warranty claim', error });
    }
});


// Get all tickets
router.get('/tickets', async (req, res) => {
    try {
        const tickets = await WarrantyClaim.find();
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Search tickets by certificate number or status
router.get('/search/:query', async (req, res) => {
    try {
        const query = req.params.query;
        const tickets = await WarrantyClaim.find({
            $or: [
                { certificateId: { $regex: query, $options: 'i' } },
                { status: { $regex: query, $options: 'i' } },
                { serialNumber: { $regex: query, $options: 'i' } }
            ]
        });
        res.json(tickets);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// Update ticket status
// Route to update the status of a warranty claim and send an email notification
router.post('/updateStatus/:id', async (req, res) => {
    try {
        const { status } = req.body;
        const { id } = req.params;

        // Find and update the ticket
        const updatedTicket = await WarrantyClaim.findByIdAndUpdate(
            id, 
            { status }, 
            { new: true } // Return the updated document
        );

        if (!updatedTicket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        console.log(updatedTicket);

        const template = await EmailTemplate.findOne({ name: 'WarrantyClaimUpdate' });
        if (!template) {
            throw new Error('Email template not found');
        }

        // Replace placeholders in the template
        let htmlContent = template.htmlContent
            .replace('{status}', status)
            .replace('{email}', updatedTicket.email);

        // Send email notification to the user
        async function sendMail() {
            const info = await transporter.sendMail({
                from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                to: `"Recipient" <${updatedTicket.emailId}>`, // Use the email from the updated ticket
                subject: template.subject, // Use the subject from the template
                html: htmlContent // Use the processed HTML content
            });

            console.log('Message sent: %s', info.messageId);
        }
        await sendMail();

        res.json(updatedTicket);
    } catch (err) {
        console.error('Error updating status:', err);
        res.status(500).json({ message: err.message });
    }
});

// Update a status by ID
router.put('/updateStatus/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updatedStatus = await StatusInfo.findByIdAndUpdate(id, { status }, { new: true, runValidators: true });
        if (updatedStatus) {
            res.status(200).json(updatedStatus);
        } else {
            res.status(404).json({ message: 'Status not found' });
        }
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a status by ID
router.delete('/deleteStatus/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deletedStatus = await StatusInfo.findByIdAndDelete(id);
        if (deletedStatus) {
            res.status(200).json({ message: 'Status deleted successfully' });
        } else {
            res.status(404).json({ message: 'Status not found' });
        }
    } catch (error) {
        console.error('Error deleting status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});




module.exports = router;
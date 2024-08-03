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
const Driver = require('../models/Driver'); 
const EmailTemplate = require('../models/Emailtemplate')
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


router.get('/' , async (req, res) => {
    try {
        const loggedIN = true;
        const drivers = await Driver.find();
        const { accessTo } = req.session.user;
        res.render('DriverManagement', { drivers,loggedIN,accessTo });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});
router.get('/add-driver' , async (req, res) => {
    try {
        const loggedIN = true;
        const drivers = await Driver.find();
        const { accessTo } = req.session.user;
        res.render('Driver/AddDriver', { drivers,loggedIN,accessTo });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});
router.get('/update-driver' , async (req, res) => {
    try {
        const loggedIN = true;
        const drivers = await Driver.find();
        const { accessTo } = req.session.user;
        res.render('Driver/UpdateDriver', { drivers,loggedIN,accessTo });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});






router.post('/Driver-Upload', upload.single('driverFile'), async (req, res) => {
    try {
        const { model, version, date } = req.body;
        const downloadLink = `/uploads/${req.file.filename}`;

        // Create and save the new driver
        const newDriver = new Driver({ model, version, downloadLink, date });
        await newDriver.save();

        // Fetch all users with the same model
        const usersToLogOut = await Warranty.find({ model: new RegExp(`^${model}$`, 'i') });

        // Fetch email template from database
        const template = await EmailTemplate.findOne({ name: 'driverUpdateAlert' });

        if (!template) {
            throw new Error('Email template not found');
        }

        // Replace placeholders in the template
        let htmlContent = template.htmlContent
            .replace('{model}', model)
            .replace('{version}', version)
            .replace('{downloadLink}', downloadLink);

        // Log out each user
        for (const user of usersToLogOut) {
            try {
                await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${user.email}>`,
                    subject: template.subject,
                    text: `Dear ${user.name},\nNew Driver For Your Model ${model} has been added with version ${version}\n\nRegards,\nTeam Support\nBitBox`,
                    html: htmlContent,
                });
            } catch (error) {
                console.error('Error sending email to user:', error);
            }
        }

        res.send('<script>alert("Driver Uploaded Successfully."); window.history.back();</script>');
    } catch (error) {
        console.error('Error uploading driver:', error);
        res.status(500).send('Error uploading driver');
    }
});


router.post('/Driver-Update/:id', upload.single('driverFile'), async (req, res) => {
    const { id } = req.params;
    const { version, model, date } = req.body;
    let updateData = { version, model, date };

    // If a new file is uploaded, include the downloadLink in the update
    if (req.file) {
        updateData.downloadLink = req.file.path;
    }

    try {
        const driver = await Driver.findByIdAndUpdate(id, updateData, { new: true });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        res.json({ success: true, message: 'Driver updated successfully', driver });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update driver', error });
    }
});

router.post('/Driver-Delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const driver = await Driver.findByIdAndDelete(id);
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        const loggedIN = true;
        const drivers = await Driver.find();
        res.render('DriverManagement',{drivers,loggedIN});
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to delete driver', error });
    }
});


module.exports = router;
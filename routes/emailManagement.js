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
        res.render('EmailManagement', { drivers,loggedIN,accessTo });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});


router.get('/emailTemplates', async (req, res) => {
    try {
        const templates = await EmailTemplate.find();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.get('/emailTemplates/:id', async (req, res) => {
    try {
        const template = await EmailTemplate.findById(req.params.id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(template);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Update an email template
router.put('/emailTemplates/:id', async (req, res) => {
    try {
        const { name, subject, htmlContent } = req.body;
        const updatedTemplate = await EmailTemplate.findByIdAndUpdate(
            req.params.id,
            { name, subject, htmlContent },
            { new: true }
        );
        if (!updatedTemplate) {
            return res.status(404).json({ message: 'Template not found' });
        }
        res.json(updatedTemplate);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});



module.exports = router;
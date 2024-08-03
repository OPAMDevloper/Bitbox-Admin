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
        const resellers = await Reseller.find();
        const loggedIN = true;
        const {accessTo } = req.session.user;
        res.render('ResellersManagement',{resellers,loggedIN,accessTo});
       
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});
router.get('/add-reseller', async (req, res) => {
    try {
        const resellers = await Reseller.find({}).lean();
        const loggedIN = true;
        res.render('Reseller/AddResellers',{resellers,loggedIN});
       
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});
router.get('/update-reseller', async (req, res) => {
    try {
        const resellers = await Reseller.find();
        const loggedIN = true;
        res.render('Reseller/UpdateResellers',{resellers,loggedIN});
       
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});



// Route to add a new reseller
router.post('/add-reseller', upload.fields([
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'msmeCertificate', maxCount: 1 },
    { name: 'plStatement', maxCount: 1 },
    { name: 'gemSellerIdScreenshot', maxCount: 1 },
    { name: 'declarationForm', maxCount: 1 }
]), async (req, res) => {
    const formData = req.body;
    const files = req.files;

    console.log(files);
    console.log(formData);
    console.log("Inside Add Reseller");

    try {
        // Process file uploads
        if (files) {
            Object.keys(files).forEach(key => {
                formData[key] = files[key][0].path; // Store the file path
            });
        }

        // Process authorizationRegions (assuming it's a multi-select)
        if (formData.authorizationRegions) {
            formData.authorizationRegions = Array.isArray(formData.authorizationRegions) 
                ? formData.authorizationRegions 
                : [formData.authorizationRegions];
        }

        const newReseller = new Reseller({
            ...formData,
            status: formData.status || 'Active'
        });

        await newReseller.save();
        res.status(201).send('Reseller added successfully');
    } catch (error) {
        console.error('Error adding reseller:', error);
        res.status(500).send('Error adding reseller');
    }
});
router.delete('/delete-reseller/:id', async (req, res) => {
    const { id } = req.params;

    try {
        //(id);
        await Reseller.findByIdAndDelete(id);
        res.status(200).send('Reseller deleted successfully');
    } catch (error) {
        console.error('Error deleting reseller:', error);
        res.status(500).send('Error deleting reseller');
    }
});
// Route to fetch a specific reseller by ID
router.get('/reseller/:id', async (req, res) => {
    try {
        const reseller = await Reseller.findById(req.params.id);
        //(reseller);
        if (reseller) {
            res.json(reseller);
        } else {
            res.status(404).json({ message: 'Reseller not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Route to update a reseller by ID
const fileFields = [
    { name: 'gstCertificate', maxCount: 1 },
    { name: 'panCard', maxCount: 1 },
    { name: 'msmeCertificate', maxCount: 1 },
    { name: 'plStatement', maxCount: 1 },
    { name: 'gemSellerIdScreenshot', maxCount: 1 },
    { name: 'declarationForm', maxCount: 1 }
];

router.put('/update-reseller/:id', upload.fields(fileFields), async (req, res) => {
    const { id } = req.params;
    try {
        const updateData = { ...req.body };

        // Handle file uploads
        for (const field of fileFields) {
            if (req.files[field.name]) {
                updateData[field.name] = req.files[field.name][0].path;
            }
        }

        const updatedReseller = await Reseller.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (updatedReseller) {
            res.status(200).send('Reseller updated successfully');
        } else {
            res.status(404).send('Reseller not found');
        }
    } catch (error) {
        console.error('Error updating reseller:', error);
        res.status(500).send('Server error');
    }
});


module.exports = router;
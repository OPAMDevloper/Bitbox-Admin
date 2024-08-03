const express = require('express');
const Login = require('../models/Login'); // Adjust path based on your project structure
const cookieParser = require("cookie-parser");
const session = require('express-session');
const bcrypt = require('bcrypt'); // Import bcrypt library
const router = express.Router();

const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');

const cors = require('cors');
const pdf = require('html-pdf');
const os = require('os');


const Warranty = require('../models/Warranty');
const Reseller = require('../models/Reseller'); 
const SerialNumber = require('../models/Serial');
const Certificate = require('../models/Certificate'); 
const Driver = require('../models/Driver'); 
const EmailTemplate = require('../models/Emailtemplate')
const { log } = require('console');

router.use(cookieParser());

router.use(session({
    secret: "Bitbox-Admin",
    saveUninitialized: true,
    resave: true
}));

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

// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    try {
        const user = await Login.findOne({ username });
  
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
  
        const isPasswordMatch = password == user.password;
  
        if (!isPasswordMatch) {
            return res.status(401).json({ success: false, message: 'Incorrect password' });
        }
  
        req.session.user = {
            id: user._id,
            username: user.username,
            accessTo: user.accessTo
        };
  
        res.json({ success: true });
    } catch (error) {
        console.error('Error logging in:', error.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});


// Example Express route to handle logout
router.post('/logout', (req, res) => {
    // Clear session
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Failed to logout' });
        }
        // Redirect to login page after logout
        res.render('login'); // Adjust this route based on your application's setup
    });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000);

        // Find the user and store OTP
        const user = await Login.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Set OTP and expiry time
        user.otp = otp;
       
        await user.save();

        // Send OTP email
        await transporter.sendMail({
            from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
            to: email,
            subject: 'Password Reset OTP',
            html: `
                <p>Dear User,</p>
                <p>You have requested a password reset. Your OTP is <b>${otp}</b>.</p>
                <p>If you did not request this, please ignore this email.</p>
                <p>Regards,<br>Team Bitbox</p>
            `
        });

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ success: false, message: 'Error sending OTP' });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;

    try {
        const otpRecord = await Login.findOne({ email, otp });
        if (!otpRecord) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        res.json({ success: true, message: 'OTP verified' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ success: false, message: 'Error verifying OTP' });
    }
});


router.post('/reset-password', async (req, res) => {
    const { email, newPassword } = req.body;

    try {
        // Find the user by email
        const user = await Login.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Hash the new password before saving
        

        // Update the user's password
        user.password = newPassword;
        await user.save();

        res.json({ success: true, message: 'Password has been reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, message: 'Error resetting password' });
    }
});




module.exports = router;

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
const EmailTemplate = require('../models/Emailtemplate');
const WarrantyOption = require('../models/WarrantyOptions');
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

router.post('/update/:id', upload.single('billPdf'), async (req, res) => {
    const id = req.params.id;
    const updateData = req.body;

    if (req.file) {
        updateData.billPdf = req.file.path; // Store the file path in the database
    }

    try {
        const result = await Warranty.updateMany(
            { batch: id },
            { $set: updateData },
            { new: true }
        );

        res.json({ success: true, result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
});



router.get('/', (req, res) => {
    const loggedIN = true;
    const { username, accessTo } = req.session.user;
    res.render('WarrantyManagement', {loggedIN,accessTo});
});
router.get('/register-warranty', (req, res) => {
    const loggedIN = true;
    res.render('Warranty/Register-Warranty', {loggedIN});
});
router.get('/singel-warranty-verify', async (req, res) => {
    const loggedIN = true;
    const itemsPerPage = 10;
    const currentPage = parseInt(req.query.page) || 1;

    try {
        const totalWarranties = await Warranty.countDocuments({ batch: null, verify: false });
        const totalPages = Math.ceil(totalWarranties / itemsPerPage);

        const warranties = await Warranty.find({ batch: null, verify: false })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('Warranty/Singel-Warranty-Verify', { 
            warranties,
            loggedIN,
            itemsPerPage,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/bulk-warranty-verify', async (req, res) => {
    try {
        const loggedIN = true;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const groupedWarranties = await Warranty.aggregate([
            {
                $match: {
                    batch: { $ne: null},
                    verify: {$ne: true}
                }
            },
            {
                $group: {
                    _id: "$batch",
                    commonFields: { $first: "$$ROOT" },
                    serialAndModel: {
                        $push: {
                            serialNumber: "$serialNumber",
                            model: "$model"
                        }
                    }
                }
            }
        ]);

        const totalCount = await Warranty.countDocuments({ batch: { $ne: null } });
        const totalPages = Math.ceil(totalCount);

        res.render('Warranty/Bulk-Warranty-Verify', { groupedWarranties, loggedIN, totalPages, currentPage: page });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/expiring-warranty-render', async (req, res) => {
    try {
        const loggedIN = true;
        res.render('Warranty/Expiring-Warranty', {loggedIN});
      
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/expiring-warranty', async (req, res) => {
    try {
        const loggedIN = true;
        const today = new Date();
        const tenDaysFromNow = new Date();
        tenDaysFromNow.setDate(today.getDate() + 10);
        
        const warranties = await Warranty.find();
        
        
        const expiringWarranties = warranties.filter(warranty => {
            const expiryDate = new Date(warranty.expiryDate); // Convert string to Date object
            return expiryDate >= today && expiryDate < tenDaysFromNow;
        });

        res.json(expiringWarranties);
      
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/send-notification', async (req, res) => {
    const { email,serialNumber,expiryDate } = req.query; // Extract email from query parameters
            // Option 2: Using toLocaleDateString with specific options to get 'Fri Jun 20 2025'
    // Convert expiryDate from string to Date object
    const expiryDateObj = new Date(expiryDate);

    // Option 2: Using toLocaleDateString with specific options to get 'Fri Jun 20 2025'
    const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
    const formattedDate2 = expiryDateObj.toLocaleDateString(undefined, options);
    try {
        // Send email using nodemailer transporter
        const info = await transporter.sendMail({
            from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
            to: email,
            subject: 'Warranty Expiring Alert',
            text: 'This is a notification email.',
            html: `<p>Dear Customer,</p> <br> Your Warranty for serial number ${serialNumber} is expiring on ${formattedDate2} <br> Please connect with us on support@bitboxpc.com to renew your warranty <br><br>Thank you for choosing BitBox. <br><br>
                    Best Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    E-mail: <a href="">support@bitboxpc.com </a> <br>
                    web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`
           
        });

        //('Notification email sent:', info.messageId);
        res.sendStatus(200); // Respond with success status
    } catch (error) {
        console.error('Error sending notification email:', error);
        res.status(500).send('Error sending notification email');
    }
});
router.get('/resellers-page', async (req, res) => {
    try {
        const resellers = await Reseller.find();
        const loggedIN = true;
        res.render('Warranty/Resellers',{resellers,loggedIN});
       
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});
router.get('/serial-numbers/:serial', async (req, res) => {
    try {
        const serial = req.params.serial;
       
        const serialNumber = await SerialNumber.findOne({ serialNumber: serial });
        if (serialNumber) {
            res.json({ valid: true, model: serialNumber.modelNumber });
        } else {
            res.json({ valid: false });
        }
    } catch (error) {
        console.error('Error checking serial number:', error);
        res.status(500).send('Error checking serial number');
    }
});
router.get('/singel-Verified_Warranty', async (req, res) => {
    const loggedIN = true;
    const itemsPerPage = 10;
    const currentPage = parseInt(req.query.page) || 1;

    try {
        const totalWarranties = await Warranty.countDocuments({ batch: null, verify: false });
        const totalPages = Math.ceil(totalWarranties / itemsPerPage);

        const warranties = await Warranty.find({ batch: null, verify: true })
            .skip((currentPage - 1) * itemsPerPage)
            .limit(itemsPerPage);

        res.render('Warranty/Singel-Verified_Warranty', { 
            warranties,
            loggedIN,
            itemsPerPage,
            currentPage,
            totalPages
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/bulk-Verified_Warranty', async (req, res) => {
    try {
        const loggedIN = true;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const groupedWarranties = await Warranty.aggregate([
            {
                $match: {
                    batch: { $ne: null},
                    verify: {$ne: false}
                }
            },
            {
                $group: {
                    _id: "$batch",
                    commonFields: { $first: "$$ROOT" },
                    serialAndModel: {
                        $push: {
                            serialNumber: "$serialNumber",
                            model: "$model"
                        }
                    }
                }
            }
        ]);

        const totalCount = await Warranty.countDocuments({ batch: { $ne: null } });
        const totalPages = Math.ceil(totalCount);

        res.render('Warranty/Bulk-Verified_Warranty', { groupedWarranties, loggedIN, totalPages, currentPage: page });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
router.get('/resellers', async (req, res) => {
    try {
        const reseller = await Reseller.find();
        console.log(reseller);
        res.json(reseller);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
router.get('/warranty-options', async (req, res) => {
    try {
        const warrantyOptions = await WarrantyOption.find();
        res.json(warrantyOptions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


router.post('/Register-Warranty', upload.single('billPdf'), async (req, res) => {
    const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber, purchaseMedium, company, reseller, warrantyType, selectedWarrantyOption } = req.body;
    const warranties = [];
    const expiryDate = expiryyear;
    const billPdfPath = req.file.path;

    const constant = numComputers == 1 ? null : Math.floor(10000000 + Math.random() * 90000000);

    const purchaseDetails = purchaseMedium === 'direct' ? company : reseller;

    for (let i = 1; i <= numComputers; i++) {
        const serialNumber = req.body[`serialNumber${i}`];
        const model = req.body[`model${i}`];

        warranties.push({
            expiryDate,
            name,
            email,
            purchaseDate,
            address,
            city,
            pincode,
            state,
            phoneNumber,
            serialNumber,
            model,
            billPdf: billPdfPath,
            batch: constant,
            purchaseDetails,
            warrantyType: selectedWarrantyOption
        });
    }

    try {
        const existingWarranties = await Warranty.find({
            serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
        });

        const enteredSerialNumbers = warranties.map(warranty => warranty.serialNumber);
        const validSerialNumbers = await SerialNumber.find({
            serialNumber: { $in: enteredSerialNumbers }
        }).distinct('serialNumber');

        const invalidSerialNumbers = enteredSerialNumbers.filter(serialNumber => !validSerialNumbers.includes(serialNumber));
        
        if (invalidSerialNumbers.length > 0) {
            return res.status(400).send(`The following serial numbers are not valid: ${invalidSerialNumbers.join(', ')}. Please enter valid serial numbers.`);
        }

        const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);
        const newWarranties = warranties.filter(warranty => !existingSerialNumbers.includes(warranty.serialNumber));
        const duplicateWarranties = warranties.filter(warranty => existingSerialNumbers.includes(warranty.serialNumber));

        const response = {
            success: newWarranties.map(warranty => warranty.serialNumber),
            duplicate: duplicateWarranties.map(warranty => warranty.serialNumber)
        };

        if (duplicateWarranties.length > 0) {
            return res.status(201).send(`This Device ${response.duplicate.join(', ')} is already registered, please connect with our customer care at support@yourdomain.com`);
        }

        await Warranty.insertMany(newWarranties);

        async function sendMail(to, subject, text, html) {
            const info = await transporter.sendMail({
                from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                to,
                subject,
                text,
                html,
            });

            console.log('Message sent: %s', info.messageId);
        }

        await sendMail(
            `"Recipient" <${email}>`,
            "Warranty Registration Submitted and Pending for Verification",
            `Dear Bitbox PC User,
            Your warranty registration has been successfully completed. We will verify the details and notify you as soon as possible.
            
            Regards,
            Team Support
            BitBox`,
            `Dear Customer, <br>
            <b>Thank you for submitting your warranty registration form. We have successfully received your details and will now proceed with verification. Rest assured, our team will carefully review your submission. <br>
            We appreciate your patience during this process. You will receive an update from us shortly regarding the status of your warranty registration. <br>
            If you have any urgent inquiries or require further assistance, please feel free to reach out to our customer support team at support@bitboxpc.com  </b>
            <br><br>
            Best Regards,<br>
            Team Bitbox
            <br><br>
            Toll Free: 1800309PATA <br>
            eMail: <a href="">support@bitboxpc.com </a> <br>
            web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
            <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`
        );

        let alertMessage = `New warranty registration request received with the following serial numbers: ${response.success.join(', ')}`;
        if (constant) {
            alertMessage += `\nBatch ID: ${constant}`;
        }

        await sendMail(
            '"Alerts" <alerts@bitboxpc.com>',
            "New Warranty Registration Request",
            alertMessage,
            alertMessage.replace(/\n/g, '<br>')
        );

        res.status(201).send('Warranty Request Submitted Successfully');
    } catch (error) {
        console.error('Error SUBMITTING warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});

// router.post('/Register-Warranty', upload.single('billPdf'), async (req, res) => {
//     const { numComputers, expiryyear, name, email, purchaseDate, address, city, pincode, state, phoneNumber, purchaseMedium, company, reseller, warrantyType, selectedWarrantyOption } = req.body;
//     const warranties = [];
//     const expiryDate = expiryyear;
//     const billPdfPath = req.file.path;
//     console.log(selectedWarrantyOption);

//     let constant = null;
//     if (numComputers > 1) {
//         constant = Math.floor(10000000 + Math.random() * 90000000);
//     }



//     const purchaseDetails = purchaseMedium === 'direct' ? company : reseller;

//     for (let i = 1; i <= numComputers; i++) {
//         const serialNumber = req.body[`serialNumber${i}`];
//         const model = req.body[`model${i}`];

//         warranties.push({
//             expiryDate,
//             name,
//             email,
//             purchaseDate,
//             address,
//             city,
//             pincode,
//             state,
//             phoneNumber,
//             serialNumber,
//             model,
//             billPdf: billPdfPath,
//             batch: constant,
//             purchaseDetails,
//             warrantyType: selectedWarrantyOption // Adding the new field to the warranty object
//         });
//     }

//     try {
//         const existingWarranties = await Warranty.find({
//             serialNumber: { $in: warranties.map(warranty => warranty.serialNumber) }
//         });

//         const existingSerialNumbers = existingWarranties.map(warranty => warranty.serialNumber);
//         const newWarranties = warranties.filter(warranty => !existingSerialNumbers.includes(warranty.serialNumber));
//         const duplicateWarranties = warranties.filter(warranty => existingSerialNumbers.includes(warranty.serialNumber));

//         const response = {
//             success: newWarranties.map(warranty => warranty.serialNumber),
//             duplicate: duplicateWarranties.map(warranty => warranty.serialNumber)
//         };

//         if (duplicateWarranties.length > 0) {
//             res.status(201).send(`This Device ${response.duplicate.join(', ')} is already registered, please connect with our customer care at support@bitboxpc.com`);
//         }

//         await Warranty.insertMany(newWarranties);

//         // Send email with PDF attachment
//         async function sendMail(to, subject, text, html) {
//             const info = await transporter.sendMail({
//                 from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
//                 to,
//                 subject,
//                 text,
//                 html,
//             });

//             console.log('Message sent: %s', info.messageId);
//         }

//         await sendMail(
//             `"Recipient" <${email}>`,
//             "Warranty Registration Submitted and Pending for Verification",
//             `Dear Bitbox PC User,
//             Your warranty registration has been successfully completed. We will verify the details and notify you as soon as possible.
            
//             Regards,
//             Team Support
//             BitBox`,
//             `Dear Customer, <br>
//             <b>Thank you for submitting your warranty registration form. We have successfully received your details and will now proceed with verification. Rest assured, our team will carefully review your submission. <br>
//             We appreciate your patience during this process. You will receive an update from us shortly regarding the status of your warranty registration. <br>
//             If you have any urgent inquiries or require further assistance, please feel free to reach out to our customer support team at support@bitboxpc.com  </b>
//             <br><br>
//             Best Regards,<br>
//             Team Bitbox
//             <br><br>
//             Toll Free: 1800309PATA <br>
//             eMail: <a href="">support@bitboxpc.com </a> <br>
//             web: <a href=" www.bitboxpc.com"> www.bitboxpc.com </a> <br><br>
//             <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140"></img>`
//         );

//         let alertMessage = `New warranty registration request received with the following serial numbers: ${response.success.join(', ')}`;
//         if (constant) {
//             alertMessage += `\nBatch ID: ${constant}`;
//         }

//         await sendMail(
//             '"Alerts" <alerts@bitboxpc.com>',
//             "New Warranty Registration Request",
//             alertMessage,
//             alertMessage.replace(/\n/g, '<br>')
//         );

//         res.status(201).send('Warranty Request Submitted Successfully');
//     } catch (error) {
//         console.error('Error SUBMITTING warranties:', error);
//         res.status(500).send('Error verifying warranties');
//     }
// });
//Verify Warrenty
router.post('/verify-warranty', async (req, res) => {
    const { serialNumber, purchaseDate, email, duration, name, address, city, phoneNumber, model, billPdf, warrantyType } = req.body;
  
    try {
        const purchaseDateObj = new Date(purchaseDate);
        const expiryDateObj = new Date(purchaseDateObj);
        expiryDateObj.setDate(expiryDateObj.getDate() + (365 * parseInt(duration)) - 1);
        expiryDateObj.setHours(0, 0, 0, 0);

        const expiryDate = new Date(expiryDateObj).toDateString();
        const purchase_date = new Date(purchaseDate).toDateString();
        let certificateID = Math.floor(1000000000 + Math.random() * 9000000000).toString();

        // Find and update the warranty information
        const warranty = await Warranty.findOneAndUpdate(
            { serialNumber: serialNumber },
            { verify: true, purchaseDate: new Date(purchaseDate), expiryDate: expiryDateObj, certificateID: certificateID },
            { new: true }
        );

        const getWarrantyImage = (duration) => {
            if (duration == 1) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/1_year_warranty.jpg";
            } else if (duration == 2) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_2.png";
            } else if (duration == 3) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_3.png";
            } 
            else if (duration == 5){
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/5_year.png"
            }
            else {
                return "";
            }
        };
        
        const warrantyImageSrc = getWarrantyImage(duration);
        const serialDetails = await SerialNumber.findOne({ serialNumber: serialNumber });

        const pdfContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warranty Certificate</title>
    <style>
        /* CSS styles */
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        .certificate {
            padding: 20px;
            border: 2px solid #000;
            margin: 20px;
            border-radius: 10px;
        }

        .certificate-header img {
            max-width: 100%;
            height: auto;
        }

        .certificate-content {
            margin-top: 20px;
        }

        .details div {
            margin: 10px 0;
        }

        .certificate-footer {
            margin-top: 20px;
            font-size: 0.9em;
        }

        .terms-conditions {
            margin-top: 20px;
        }

        .terms-conditions h3 {
            margin-bottom: 10px;
        }

        .specs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }

        .specs-table th, .specs-table td {
            border: 1px solid #ddd;
            padding: 8px;
        }

        .specs-table th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-header">
            <img src="${warrantyImageSrc}" alt="${duration} Year Warranty">
        </div>
        <div class="certificate-content">
            <p>This document certifies the warranty coverage for the product purchased from PATA Electric Company and serves as proof of your entitlement to warranty services. Please read this certificate carefully for important terms and conditions.</p>
            <div class="details">
               <div>
                    <span>■ Product Model Number:</span> ${model}
                </div>
                <div>
                    <span>■ Product Serial Number:</span> ${serialNumber}
                </div>
                <div>
                    <span>■ Date of Purchase:</span> ${purchase_date}
                </div>
                <div>
                    <span>■ Purchaser's Name:</span> ${name}
                </div>
                <div>
                    <span>■ Seller's Name:</span> ${warranty.purchaseDetails}
                </div>
                <div>
                    <span>■ Warranty Period:</span> ${duration} Years
                </div>
                <div>
                    <span>■ Warranty Expiry:</span> ${expiryDate}
                </div>
                <div>
                    <span>■ Certificate ID:</span> ${certificateID}
                </div>
            </div>

            <table class="specs-table">
                <thead>
                    <tr>
                        <th>Specification</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Processor</td>
                        <td>${serialDetails.processor}</td>
                    </tr>
                    <tr>
                        <td>Motherboard</td>
                        <td>${serialDetails.motherboard}</td>
                    </tr>
                    <tr>
                        <td>RAM</td>
                        <td>${serialDetails.RAM1}</td>
                    </tr>
                    <tr>
                        <td>SSD</td>
                        <td>${serialDetails.SSD_SATA}</td>
                    </tr>
                    <tr>
                        <td>HDD</td>
                        <td>${serialDetails.HDD1}</td>
                    </tr>
                    <tr>
                        <td>Monitor Size</td>
                        <td>${serialDetails.monitorSize}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="certificate-footer">
            <p>PATA Electric Company warrants that the product mentioned above is free from defects in material and workmanship under normal use during the warranty period. The warranty covers repairs or replacement of the product components, subject to the terms and conditions specified herein.</p>
        </div>
        <div class="terms-conditions">
            <h3>Terms and Conditions:</h3>
            <p>■ Warranty Period: The warranty period commences on the date of purchase and lasts for the duration specified on this certificate.</p>
            <p>■ Proof of Purchase: This certificate, along with the original purchase receipt, serves as proof of purchase and is required for warranty claims.</p>
            <p>■ Scope of Warranty: The warranty covers defects in material and workmanship. It does not cover damages resulting from accidents, misuse, alterations, or unauthorized repairs.</p>
            <p>■ Warranty Service: In the event of a covered defect, please contact our customer support at Toll-Free: 18003009PATA | support@bitboxpc.com to initiate a warranty claim.</p>
        </div>
    </div>
</body>
</html>
        `;


        const pdfOptions = {
            format: 'A2',
            childProcessOptions: {
                env: {
                    OPENSSL_CONF: '/dev/null'
                }
            }
        };

        // Save PDF
        const pdfPath = `uploads/warranty-${serialNumber}.pdf`;
        pdf.create(pdfContent, pdfOptions).toFile(pdfPath, async (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                return res.status(500).send('Error creating PDF');
            }

            // Fetch email template from the database
            const template = await EmailTemplate.findOne({ name: 'warrantyVerification' });
            if (!template) {
                throw new Error('Email template not found');
            }

            // Replace placeholders in the template
            let htmlContent = template.htmlContent
                .replace('{serialNumber}', serialNumber)
                .replace('{purchaseDate}', purchaseDate)
                .replace('{expiryDate}', expiryDateObj.toDateString())
                .replace('{duration}', duration)
                .replace('{warrantyType}', warrantyType)
                .replace('{certificateID}', certificateID);

            // Send email with attachment
            async function sendMail() {
                const info = await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${email}>`,
                    subject: template.subject,
                    html: htmlContent,
                    attachments: [
                        {
                            filename: `warranty-${serialNumber}.pdf`,
                            path: result.filename
                        }
                    ]
                });

                console.log('Message sent: %s', info.messageId);
            }
            await sendMail();

            await new Certificate({
                serialNumber: warranty.serialNumber,
                certificateLink: pdfPath
            }).save();

            res.send('<script>alert("Warranty Verified Successfully."); window.history.back();</script>');
        });
    } catch (error) {
        console.error('Error verifying warranty:', error);
        res.status(500).send('Error verifying warranty');
    }
});
//Verify Bulk Warrenty
router.post('/bulk-warranty-verify', async (req, res) => {
    const { batch, purchaseDate, email, duration, name, address, city, phoneNumber, model, billPdf, warrantyType} = req.body;

    try {
        const purchaseDateObj = new Date(purchaseDate);
        const expiryDateObj = new Date(purchaseDateObj);
        expiryDateObj.setDate(expiryDateObj.getDate() + (365 * parseInt(duration)) - 1);

        // Ensure the expiry date has the correct format and zero time
        expiryDateObj.setHours(0, 0, 0, 0);

        const expiryDate = new Date(expiryDateObj).toDateString();
        const purchase_date = new Date(purchaseDate).toDateString();
        let certificateID = Math.floor(1000000000 + Math.random() * 9000000000).toString();


        // Find and update the warranty information
        const warranty = await Warranty.updateMany(
            { batch: batch },
            { verify: true, purchaseDate: new Date(purchaseDate), expiryDate: expiryDateObj,certificateID:certificateID },
            { new: true }
        );


        // Fetch all warranties associated with the batch after update
        const warranties = await Warranty.find({ batch: batch });

        const getWarrantyImage = (duration) => {
            if (duration == 1) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/1_year_warranty.jpg";
            } else if (duration == 2) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_2.png"; // Replace with actual URL
            } else if (duration == 3) {
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_3.png"; // Replace with actual URL
            } 
            else if (duration == 5){
                return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/5_year.png"
            }else {
                return ""; // Default to an empty string if no valid duration is provided
            }
        };
        
        const warrantyImageSrc = getWarrantyImage(duration);

        let pdfContent = `
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warranty Certificate</title>
    <style>
        body {
            font-family: Arial, sans-serif;
        }

        .certificate {
            border: 5px solid #C7A94F;
            padding: 10px;
            display: grid;
            grid-template-rows: auto 1fr auto;
            position: relative;
        }

        .certificate:before {
            content: "";
            position: absolute;
            top: 5px;
            left: 5px;
            right: 5px;
            bottom: 5px;
            border: 2px dotted #C7A94F;
            pointer-events: none;
        }

        .certificate-header {
            display: grid;
            grid-template-columns: 1fr;
            align-items: center;
            margin-bottom: 20px;
            text-align: center;
        }

        .certificate-header img {
            width: 100%;
            height: auto;
        }

        .certificate-content {
            margin-top: 20px;
        }

        .certificate-content p {
            font-size: 24px;
            font-weight: 500;
        }

        .details {
            display: grid;
            grid-template-columns: auto auto;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
            text-align: center;
        }

        .details div {
            margin-bottom: 10px;
        }

        .details div span {
            display: inline-block;
            width: 250px;
            font-size: 20px;
        }

        .certificate-footer {
            margin-top: 20px;
            font-size: 24px;
            width: 100%;
        }

        .terms-conditions {
            margin-top: 20px;
            font-size: 18px;
            width: 100%;
        }
        .warranty-info {
    border-collapse: collapse;
    width: 100%;
}

.warranty-info th, .warranty-info td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
}

.warranty-info th {
    background-color: #f2f2f2;
}

.warranty-info tr:hover {
    background-color: #f2f2f2;
}
    </style>
</head>
<body>
    <div class="certificate">
        <div class="certificate-header">
            <img src="${warrantyImageSrc}" alt="${duration} Year Warranty">
        </div>

        <th>Certificate ID : ${certificateID}</th>

        <div class="certificate-content">
            <p>This document certifies the warranty coverage for the product purchased from PATA Electric Company and serves as proof of your entitlement to warranty services. Please read this certificate carefully for important terms and conditions.</p>
            <div class="details">
                    <table class="warranty-info">
                        <tr>
                            <th>Product Model Number</th>
                            <th>Product Serial Number</th>
                            <th>Date of Purchase</th>
                            <th>Purchaser's Name</th>
                            <th>Seller's Name</th>
                            <th>Warranty Period</th>
                            <th>Expiry Date</th>
                        </tr>
         `;
        warranties.forEach(entry => {
            pdfContent += `
                <tr>
                    <td>${entry.model}</td>
                    <td>${entry.serialNumber}</td>
                    <td>${purchase_date}</td>
                    <td>${entry.name}</td>
                    <td>${entry.purchaseDetails}</td>
                    <td>${duration} Years</td>
                    <td>${expiryDate}</td>
                </tr>`;
        });
        pdfContent += `
                    </table>
                </div>
            </div>

            
        
       
           


            <br> <br> <br> <br>
            <div class="certificate-footer">
                <p>PATA Electric Company warrants that the product mentioned above is free from defects in material and workmanship under normal use during the warranty period. The warranty covers repairs or replacement of the product components, subject to the terms and conditions specified herein.</p>
            </div>
            <div class="terms-conditions">
                <h3>Terms and Conditions:</h3>
                <p>■ Warranty Period: The warranty period commences on the date of purchase and lasts for the duration specified on this certificate.</p>
                <p>■ Proof of Purchase: This certificate, along with the original purchase receipt, serves as proof of purchase and is required for warranty claims.</p>
                <p>■ Scope of Warranty: The warranty covers defects in material and workmanship. It does not cover damages resulting from accidents, misuse, alterations, or unauthorized repairs.</p>
                <p>■ Warranty Service: In the event of a covered defect, please contact our customer support at Toll-Free: 18003009PATA | support@bitboxpc.com to initiate a warranty claim.</p>
            </div>
        </div>
    </div>
 </div>
</body>
</html>
        `;

// //(pdfContent); // Outputs the complete HTML content for the warranty certificates


        const pdfOptions = {
            format: 'A2',
            childProcessOptions: {
                env: {
                    OPENSSL_CONF: '/dev/null'
                }
            }
        };


        // Save PDF
        const pdfPath = `uploads/bulk-warranty-verification-${batch}.pdf`;
        pdf.create(pdfContent,pdfOptions).toFile(pdfPath, async (err, result) => {
            if (err) {
                console.error('Error creating PDF:', err);
                res.status(500).send('Error creating PDF');
                return;
            }

            // Save certificate information in the database
            const certificatePromises = warranties.map(warranty => {
                return new Certificate({
                    serialNumber: warranty.serialNumber,
                    certificateLink: pdfPath
                }).save();
            });
            await Promise.all(certificatePromises);

            // Send email with PDF attachment
            async function sendMail() {
                const info = await transporter.sendMail({
                    from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                    to: `"Recipient" <${email}>`,
                    subject: "Warranty Verification Completed: Your Warranty is Attached",
                    text: `Dear Bitbox PC User,
                    Your bulk warranty verification details for batch number <b> ${batch} </b> have been processed successfully. Please find the details attached.
                    
                    Regards,
                    Team Support
                    BitBox`,
                    html: `<b>Dear Bitbox PC User, <br> We are pleased to inform you that the bulk warranty verification process has been successfully completed. Your warranty certificate is  attached here.</br>
                    <br><br>

                    <b>Details: <br>
                    Warranty Period: ${duration} Years <br>
                    Warranty Expiry: ${expiryDateObj.toDateString()} <br>
                    <h2>Coverage Details: ${warrantyType} </h2>  <br>
                    <h1>Certificate ID : ${certificateID}</h1>
                    </br>


                    <br><br>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com<br><br>
                    Regards,<br>
                    Team Bitbox
                    <br><br>
                    Toll Free: 1800309PATA <br>
                    eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a> <br>
                    web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a> <br><br>
                    <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140">`,
                    attachments: [
                        {
                            filename: `bulk-warranty-verification-${batch}.pdf`,
                            path: result.filename,
                        },
                    ],
                });

                //('Message sent: %s', info.messageId);
            }
            await sendMail();

            res.send('<script>alert("Bulk Warranty Verification Successful. PDF sent to your email."); window.history.back();</script>');
        });

    } catch (error) {
        console.error('Error verifying warranties:', error);
        res.status(500).send('Error verifying warranties');
    }
});
// Route to add a new reseller
router.post('/add-reseller', async (req, res) => {
    const { name, email, phone, city } = req.body; // Extract name, email, phone, and city from req.body

    try {
        const newReseller = new Reseller({
            name,
            email,
            phone,
            city,
            status: 'Active' // Assuming all new resellers are initially active
        });

        await newReseller.save(); // Save the new reseller to the database
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
router.post('/update-warranty/:warrantyId', upload.single('billPdf'), async (req, res) => {
    const warrantyId = req.params.warrantyId;
    const updatedWarrantyData = req.body;

    // If a new file was uploaded, add its path to the updated data
    if (req.file) {
        updatedWarrantyData.billPdf = req.file.path;
    }

    try {
        const warranty = await Warranty.findByIdAndUpdate(warrantyId, updatedWarrantyData, { new: true });
        
        // Check if warranty is verified
        if (warranty.verify) {
            const getWarrantyImage = (duration) => {
                if (duration == 1) {
                    return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/1_year_warranty.jpg";
                } else if (duration == 2) {
                    return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_2.png"; // Replace with actual URL
                } else if (duration == 3) {
                    return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/Warrant_3.png"; // Replace with actual URL
                } else if (duration == 5) {
                    return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/5_year.png"
                } else {
                    return "https://raw.githubusercontent.com/OPAMDevloper/Bitbox-Admin/master/logos/default.png"; // Default to an empty string if no valid duration is provided
                }
            };
            
            const warrantyImageSrc = getWarrantyImage(updatedWarrantyData.durationnew);
            const expiryDate = new Date(warranty.expiryDate).toDateString();
    
            const pdfContent = `
            <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Warranty Certificate</title>
        <style>
            body {
                font-family: Arial, sans-serif;
            }
    
            .certificate {
                border: 5px solid #C7A94F;
                padding: 10px;
                display: grid;
                grid-template-rows: auto 1fr auto;
                position: relative;
            }
    
            .certificate:before {
                content: "";
                position: absolute;
                top: 5px;
                left: 5px;
                right: 5px;
                bottom: 5px;
                border: 2px dotted #C7A94F;
                pointer-events: none;
            }
    
            .certificate-header {
                display: grid;
                grid-template-columns: 1fr;
                align-items: center;
                margin-bottom: 20px;
                text-align: center;
            }
    
            .certificate-header img {
                width: 100%;
                height: auto;
            }
    
            .certificate-content {
                margin-top: 20px;
            }
    
            .certificate-content p {
                font-size: 24px;
                font-weight: 500;
            }
    
            .details {
                display: grid;
                grid-template-columns: auto auto;
                gap: 10px;
                justify-content: center;
                margin-top: 10px;
                text-align: center;
            }
    
            .details div {
                margin-bottom: 10px;
            }
    
            .details div span {
                display: inline-block;
                width: 250px;
                font-size: 20px;
            }
    
            .certificate-footer {
                margin-top: 20px;
                font-size: 24px;
                width: 100%;
            }
    
            .terms-conditions {
                margin-top: 20px;
                font-size: 18px;
                width: 100%;
            }
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="certificate-header">
                <img src="${warrantyImageSrc}" alt="${warranty.duration} Year Warranty">
            </div>
    
            <div class="certificate-content">
                <p>This document certifies the warranty coverage for the product purchased from PATA Electric Company and serves as proof of your entitlement to warranty services. Please read this certificate carefully for important terms and conditions.</p>
                <div class="details">
                   <div>
                        <span>■ Product Model Number:</span> ${warranty.model}
                    </div>
                    <div>
                        <span>■ Product Serial Number:</span> ${warranty.serialNumber}
                    </div>
                    <div>
                        <span>■ Date of Purchase:</span> ${warranty.purchaseDate}
                    </div>
                    <div>
                        <span>■ Purchaser's Name:</span> ${warranty.name}
                    </div>
                    <div>
                        <span>■ Seller's Name:</span> ${warranty.purchaseDetails}
                    </div>
                    
                    <div>
                        <span>■ Warranty Expiry:</span> ${expiryDate}
                    </div>
                </div>
            </div>
    
            <div class="certificate-footer">
                <p>PATA Electric Company warrants that the product mentioned above is free from defects in material and workmanship under normal use during the warranty period. The warranty covers repairs or replacement of the product components, subject to the terms and conditions specified herein.</p>
            </div>
    
            <div class="terms-conditions">
                <h3>Terms and Conditions:</h3>
                <p>■ Warranty Period: The warranty period commences on the date of purchase and lasts for the duration specified on this certificate.</p>
                <p>■ Proof of Purchase: This certificate, along with the original purchase receipt, serves as proof of purchase and is required for warranty claims.</p>
                <p>■ Scope of Warranty: The warranty covers defects in material and workmanship. It does not cover damages resulting from accidents, misuse, alterations, or unauthorized repairs.</p>
                <p>■ Warranty Service: In the event of a covered defect, please contact our customer support at Toll-Free: 18003009PATA | support@bitboxpc.com to initiate a warranty claim.</p>
            </div>
        </div>
    </body>
    </html>
            `;
    
    
            const pdfOptions = {
                format: 'A2',
                childProcessOptions: {
                    env: {
                        OPENSSL_CONF: '/dev/null'
                    }
                }
            };
    
            // Save PDF
            const pdfPath = `uploads/warranty-${warranty.serialNumber}.pdf`;
            pdf.create(pdfContent,pdfOptions).toFile(pdfPath, async (err, result) => {
                if (err) {
                    console.error('Error creating PDF:', err);
                    return res.status(500).send('Error creating PDF');
                }
    
                // Format expiry date
                const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
                // const formattedDate2 = expiryDateObj.toLocaleDateString(undefined, options);
    
                // Send email with attachment
                async function sendMail() {
                    const info = await transporter.sendMail({
                        from: '"Bitbox Alerts" <alerts@bitboxpc.com>',
                        to: `"Recipient" <${warranty.email}>`,
                        subject: "Warranty Verification Completed: Your Warranty is Attached",
                        text: `Dear Bitbox PC User,
                        Your warranty for serial number ${warranty.serialNumber} has been verified.
                        System Purchase Date: ${warranty.purchaseDate}
                        Warranty End date: ${warranty.expiryDate.toString()}
                        Regards,
                        Team Support
                        BitBox`,
                        html: `<b>We are pleased to inform you that the bulk warranty verification process has been successfully completed. Your warranty certificate is  attached here.</b>
                        <br><br>
    
                        <b>Details: <br>
                        Warranty Period: ${updatedWarrantyData.durationnew} Years <br>
                        Warranty Expiry: ${expiryDate} <br>
                        <h2>Coverage Details: ${warranty.warrantyType} </h2>
                        </b>
    
                        <br><br>If you have any questions about your warranty coverage or need further assistance, please feel free to contact our customer support team at support@bitboxpc.com<br><br>
                        Regards,<br>
                        Team Bitbox
                        <br><br>
                        Toll Free: 1800309PATA <br>
                        eMail: <a href="mailto:support@bitboxpc.com">support@bitboxpc.com</a> <br>
                        web: <a href="http://www.bitboxpc.com">www.bitboxpc.com</a> <br><br>
                        <img src='https://www.bitboxpc.com/wp-content/uploads/2024/04/BitBox_logo1.png' height="60" width="140">`,
                        attachments: [
                            {
                                filename: `warranty-${warranty.serialNumber}.pdf`,
                                path: result.filename
                            }
                        ]
                    });
    
                    //('Message sent: %s', info.messageId);
                }
                await sendMail();
    
                await new Certificate({
                    serialNumber: warranty.serialNumber,
                    certificateLink: pdfPath
                }).save();
    
                res.send('<script>alert("Warranty Verified Successfully."); window.history.back();</script>');
            });
        }

        res.json({ success: true, message: 'Warranty updated successfully.' });
    } catch (err) {
        console.error('Error updating warranty:', err);
        res.status(500).json({ success: false, message: 'Error updating warranty.' });
    }
});




module.exports = router;
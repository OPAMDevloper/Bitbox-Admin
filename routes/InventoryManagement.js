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
const Tester = require('../models/Tester');
const DynamicField = require('../models/DynamicField');
const { log } = require('console');


router.use(express.json());
router.use(express.urlencoded({ extended: true }));


// Multer storage configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bitbox-' + uniqueSuffix + path.extname(file.originalname));
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
    const loggedIN = true;
    const serials = await SerialNumber.find();
    const { accessTo } = req.session.user;
    res.render('InventoryManagement', {serials,loggedIN,accessTo});
});
router.get('/add-inventory', async (req, res) => {
    const loggedIN = true;
    const serials = await SerialNumber.find();
    const { accessTo } = req.session.user;
    res.render('Inventory/AddInventory', {serials,loggedIN,accessTo});
});
router.get('/update-inventory', async (req, res) => {
    const loggedIN = true;
    const serials = await SerialNumber.find();
    const testers = await Tester.find();
    res.render('Inventory/UpdateInventory', {serials,loggedIN,testers});
});
router.get('/view-inventory', async (req, res) => {
    const loggedIN = true;
    const serials = await SerialNumber.find();
    res.render('Inventory/InventoryList', {serials,loggedIN});
});
router.get('/delete-inventory', async (req, res) => {
    const loggedIN = true;
    const serials = await SerialNumber.find();
    res.render('Inventory/DeleteInventory', {serials,loggedIN});
});
router.get('/add-tester', async (req, res) => {
    const loggedIN = true;
    const testers = await Tester.find();
    res.render('Inventory/AddTester', {testers,loggedIN});
});
router.get('/testers', async (req, res) => {
    try {
        const testers = await Tester.find();
        res.json(testers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});




router.post('/Inventory-add', upload.single('file'), async (req, res) => {
    const {
        serialNumber, modelNumber, testedBy, processor, motherboard,
        RAM1, RAM2, RAM3, RAM4, HDD1, HDD2, SSD_SATA, SSD_NVMe,
        WifiModule, SoftwareApp, AddOn, GraphicCard, BluetoothModule,
        monitorSize, operatingSystem, keyboardMouseCombo
    } = req.body;
    const file = req.file ? req.file.filename : null;

    const dynamicFields = {};
        const allFields = await DynamicField.find();
        console.log(allFields);
        allFields.forEach(field => {
            if (req.body[field.name]) {
                dynamicFields[field.name] = req.body[field.name];
                console.log(dynamicFields[field.name]);
            }
        });

    try {
        // Check if the serial number already exists
        const existingSerial = await SerialNumber.findOne({ serialNumber });

        if (existingSerial) {
            // If serial number exists, return an error message
            return res.status(400).send('Serial number already exists');
        }

        // Fetch the tester's name using the ObjectId
        const tester = await Tester.findById(testedBy);
        if (!tester) {
            return res.status(400).send('Tester not found');
        }

        // Create a new SerialNumber document
        const newSerial = new SerialNumber({
            serialNumber,
            modelNumber,
            testedBy: tester.name, // Use tester's name instead of ObjectId
            uploadedFile: file,
            processor,
            motherboard,
            RAM1,
            RAM2,
            RAM3,
            RAM4,
            HDD1,
            HDD2,
            SSD_SATA,
            SSD_NVMe,
            WifiModule,
            SoftwareApp,
            AddOn,
            GraphicCard,
            BluetoothModule,
            monitorSize,
            operatingSystem,
            keyboardMouseCombo,
            dynamicFields
        });

        // Save the new SerialNumber document to the database
        await newSerial.save();
        res.status(201).send('Inventory added successfully');
    } catch (error) {
        console.error('Error adding serial number:', error);
        res.status(500).send('Error adding serial number');
    }
});

router.post('/add-dynamic-field', async (req, res) => {
    try {
        const { fieldName } = req.body;
        const newField = new DynamicField({ name: fieldName });
        await newField.save();
        res.status(201).json({ message: 'Field added successfully', field: newField });
    } catch (error) {
        res.status(500).json({ message: 'Error adding field', error: error.message });
    }
});

router.get('/get-dynamic-fields', async (req, res) => {
    try {
        const fields = await DynamicField.find();
        res.json(fields);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fields', error: error.message });
    }
});



// Route to update a serial number
router.post('/Inventory-update', upload.single('uploadedFile'), async (req, res) => {
    try {
        const { _id, serialNumber, modelNumber, testedBy, processor, motherboard, RAM1, RAM2, RAM3, RAM4, HDD1, HDD2, SSD_SATA, SSD_NVMe, WifiModule, SoftwareApp, AddOn, GraphicCard, BluetoothModule, monitorSize, operatingSystem, keyboardMouseCombo } = req.body;

        let uploadedFile;
        if (req.file) {
            uploadedFile = req.file.filename; // Handle file upload
        }

        console.log("Inside");

        const tester = await Tester.findById(testedBy);

        const updatedData = {
            serialNumber,
            modelNumber,
            testedBy: tester ? tester.name : null, // Ensure tester exists
            processor,
            motherboard,
            RAM1,
            RAM2,
            RAM3,
            RAM4,
            HDD1,
            HDD2,
            SSD_SATA,
            SSD_NVMe,
            WifiModule,
            SoftwareApp,
            AddOn,
            GraphicCard,
            BluetoothModule,
            monitorSize,
            operatingSystem,
            keyboardMouseCombo
        };

        // Handle file if present
        if (uploadedFile) {
            updatedData.uploadedFile = uploadedFile;
        }

        // Add dynamic fields if present
        const dynamicFields = req.body.dynamicFields; // Assumes dynamicFields is sent as an object
        if (dynamicFields) {
            updatedData.dynamicFields = JSON.parse(dynamicFields); // Parse if sent as a JSON string
        }

        console.log(updatedData);

        await SerialNumber.findOneAndUpdate(
            { serialNumber }, // Query to find the document
            updatedData,      // Data to update
            { new: true }     // Option to return the updated document
        );
        res.redirect('/api/inventoryManagement/update-inventory');
    } catch (err) {
        console.error('Error updating serial number:', err);
        res.status(500).send('Server Error');
    }
});

router.post('/Inventory-delete', async (req, res) => {
    try {
        const { _id } = req.body;
        await SerialNumber.findByIdAndDelete(_id);

        // Send a success message
        res.status(200).json({ message: 'Delete successful' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

router.put('/update-dynamic-field/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { newName } = req.body;
        const updatedField = await DynamicField.findByIdAndUpdate(id, { name: newName }, { new: true });
        res.json(updatedField);
    } catch (error) {
        res.status(500).json({ message: 'Error updating field', error: error.message });
    }
});

router.delete('/delete-dynamic-field/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await DynamicField.findByIdAndDelete(id);
        res.json({ message: 'Field deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting field', error: error.message });
    }
});


// Route to add a new tester
router.post('/testers/add', async (req, res) => {
    try {
        const { name } = req.body;
        const newTester = new Tester({ name });
        await newTester.save();
        res.redirect('/api/inventoryManagement/add-tester');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Route to update a tester
router.post('/testers/update/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        await Tester.findByIdAndUpdate(id, { name });
        res.redirect('/api/inventoryManagement/add-tester');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Route to delete a tester
router.post('/testers/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Tester.findByIdAndDelete(id);
        res.redirect('/api/inventoryManagement/add-tester');
    } catch (err) {
        res.status(500).send('Server error');
    }
});

module.exports = router;
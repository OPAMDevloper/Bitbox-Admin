const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const session = require('express-session');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const pdf = require('html-pdf');
const os = require('os');
const app = express();
const port = 5001;


// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.static('public'));
app.use('/', express.static(path.join(__dirname, 'views')));

// Serve static files from the 'uploads' and 'scripts' directory
app.use('/uploads', express.static('uploads'));
app.use('/static', express.static(path.join(__dirname, 'static')));

//App set
app.set('view engine', 'ejs');
app.use(cookieParser());
app.use(session({
    secret: "Bitbox-Admin",
    saveUninitialized: true,
    resave: true
}));
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});


//MongoDB Connecction with URL
const dbURI = 'mongodb+srv://Bitbox-admin:Bitbox-admin@cluster0.gpzogeq.mongodb.net/Bitbox-admin?retryWrites=true&w=majority&appName=Cluster0';
mongoose.connect(dbURI)
    .then(() => {
        //('MongoDB connected');
    })
    .catch((err) => {
        console.error('Database connection error:', err);
    });



// Home Route
app.get('/', (req, res) => {
    res.render('login');
});
// Dashboard route
app.get('/dashboard', (req, res) => {
    if (!req.session.user) {
        // Redirect to login if not authenticated
        return res.status(401).redirect('/login');
    }
  
    // User is authenticated, render dashboard
    const { username, accessTo } = req.session.user;
    res.render('dashboard', { username, accessTo });
});



app.use('/api/auth', require('./routes/auth'));
app.use('/api/userManagement', require('./routes/userManagement'));
app.use('/api/warrantyManagement', require('./routes/warrantyManagement'));
app.use('/api/driverManagement', require('./routes/driverManagement'));
app.use('/api/inventoryManagement', require('./routes/InventoryManagement'));
app.use('/api/resellerManagement', require('./routes/resellerManagement'));
app.use('/api/ticketManagement', require('./routes/ticketManagement'));
app.use('/api/emailManagement', require('./routes/emailManagement'));
app.use('/api/warrantyType', require('./routes/warrantyType'));

app.get('/add-reseller', async (req, res) => {
    try {

        res.render('ResellerForm');
       
    } catch (error) {
        console.error('Error fetching resellers:', error);
        res.status(500).send('Error fetching resellers');
    }
});





app.listen(port, () => {
    //(`Server is running`);
});

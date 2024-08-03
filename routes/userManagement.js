const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt'); // Import bcrypt library
const Login = require('../models/Login'); // Adjust path as per your project structure

// Route to render usermanagement.ejs and display users
router.get('/usermanagement', async (req, res) => {
    try {
        const users = await Login.find(); // Fetch all users from Login collection
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('UserManagment', { users,loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});

router.get('/add-user', async (req, res) => {
    try {
        const users = await Login.find(); // Fetch all users from Login collection
        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('User/AddUser', { users ,loggedIN,accessTo}); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});

router.get('/update-user', async (req, res) => {
    try {
        const users = await Login.find(); // Fetch all users from Login collection

        const loggedIN= true;
        const { username, accessTo } = req.session.user;
        res.render('User/UpdateUser', { users,loggedIN,accessTo }); // Render usermanagement.ejs and pass users data
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Server error');
    }
});



// Route to handle form submission for adding a new admin
router.post('/addadmin', async (req, res) => {
    const { username, password, roles } = req.body;

    try {
       

        // Create new admin user
        const newAdmin = new Login({
            username,
            password: password,
            accessTo:roles
        });

        // Save new admin to database
        await newAdmin.save();


        res.redirect('usermanagement'); // Redirect back to usermanagement page after adding admin
    } catch (error) {
        console.error('Error adding admin:', error);
        res.status(500).send('Server error');
    }
});

router.post('/users/:id', async (req, res) => {
    const userId = req.params.id;
    //(userId);

    try {
        // Find user by ID and delete
        const deletedUser = await Login.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

       

        res.redirect('../usermanagement'); 
    } catch (error) {
        console.error('Error deleting user:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/update', async (req, res) => {
    try {
        const { _id, username, password, roles } = req.body;
        //(password);

        const updatedUser = await Login.findByIdAndUpdate(_id, {
            username,
            password,
            accessTo: roles ? roles : []
        }, { new: true });
        const {  accessTo } = req.session.user;
        
        const users = await Login.find(); // Fetch all users from Login collection
        res.render('UserManagment', { users,accessTo });
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Login.findByIdAndDelete(id);
        res.redirect('/usermanagement'); // Redirect to appropriate page
    } catch (err) {
        res.status(500).send('Server Error');
    }
});


router.get('/user/:id', async (req, res) => {
    try {
        //('Fetching user with ID:', req.params.id);
        const user = await Login.findById(req.params.id);
        console.log(user);
        if (!user) {
            //('User not found for ID:', req.params.id);
            return res.status(404).json({ error: 'User not found' });
        }
        //('User found:', user);
        res.json(user);
    } catch (err) {
        console.error('Error fetching user:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});


module.exports = router;
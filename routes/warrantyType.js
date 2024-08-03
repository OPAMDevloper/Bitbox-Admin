const express = require('express');
const router = express.Router();
const WarrantyType = require('../models/WarrantyOptions');

router.use(express.urlencoded({ extended: true }));

// GET - Display all warranty options
router.get('/', async (req, res) => {
    try {
        const warrantyOptions = await WarrantyType.find();
        res.render('WarrantyType', { warrantyOptions, editOption: null });
    } catch (error) {
        res.status(500).send('Error fetching data');
    }
});

// POST - Add a new warranty option
router.post('/add', async (req, res) => {
    try {
        const { type, value, label } = req.body;
        await WarrantyType.create({ type, value, label });
        res.redirect('/api/warrantyType');
    } catch (error) {
        res.status(500).send('Error adding warranty option');
    }
});

// GET - Display edit form for a specific warranty option
router.get('/edit/:id', async (req, res) => {
    try {
        const editOption = await WarrantyType.findById(req.params.id);
        const warrantyOptions = await WarrantyType.find();
        res.render('WarrantyType', { warrantyOptions, editOption });
    } catch (error) {
        res.status(500).send('Error fetching warranty option for edit');
    }
});

// POST - Update a warranty option
router.post('/update/:id', async (req, res) => {
    try {
        const { type, value, label } = req.body;
        await WarrantyType.findByIdAndUpdate(req.params.id, { type, value, label });
        res.redirect('/api/warrantyType');
    } catch (error) {
        res.status(500).send('Error updating warranty option');
    }
});

// POST - Delete a warranty option
router.post('/delete/:id', async (req, res) => {
    try {
        await WarrantyType.findByIdAndDelete(req.params.id);
        res.redirect('/api/warrantyType');
    } catch (error) {
        res.status(500).send('Error deleting warranty option');
    }
});

module.exports = router;
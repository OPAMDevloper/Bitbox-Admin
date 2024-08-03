const mongoose = require('mongoose');

const warrantySchema = new mongoose.Schema({
    name: String,
    email: String,
    serialNumber: String,
    purchaseDate: Date,
    expiryDate: String, // Changed to String to store "1 Year", "2 Years", etc.
    address: String,
    city: String,
    pincode: String,
    state: String,
    phoneNumber: String,
    model: String,
    billPdf: String,
    verify: { type: Boolean, default: false },
    batch: { type: String, default: null },
    purchaseDetails: String,
    warrantyType: String,
    certificateID: String,
});

const Warranty = mongoose.model('Warranty', warrantySchema);

module.exports = Warranty;

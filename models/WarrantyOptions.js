const mongoose = require('mongoose');

const warrantyOptionSchema = new mongoose.Schema({
    type: { type: String, required: true }, // 'on-site' or 'off-site'
    value: { type: String, required: true },
    label: { type: String, required: true }
});

const WarrantyOption = mongoose.model('WarrantyOption', warrantyOptionSchema);

module.exports = WarrantyOption;

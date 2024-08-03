const mongoose = require('mongoose');

const warrantyClaimSchema = new mongoose.Schema({
    certificateId: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    emailId: { type: String, required: true },
    serialNumber: { type: String, required: true },
    message:{type:String, required: true },
    status: { type: String, default: 'submitted' }
});

const WarrantyClaim = mongoose.model('WarrantyClaim', warrantyClaimSchema);

module.exports = WarrantyClaim;

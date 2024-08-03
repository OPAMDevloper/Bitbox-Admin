const mongoose = require('mongoose');


const certificateSchema = new mongoose.Schema({
    serialNumber: {
        type: String,
        required: true,
    },
    certificateLink: {
        type: String,
        required: true,
    },
    OTP: { 
        type: String, 
        default: null 
    },
    otpTimestamp: { 
        type: Date,
        default: null 
    },
});

const Certificate = mongoose.model('Certificate', certificateSchema);

module.exports = Certificate;

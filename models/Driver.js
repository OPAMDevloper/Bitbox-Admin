const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
    
    model: { type: String, required: true },
    version: { type: String, required: true },
    downloadLink: { type: String, required: true },
    date: {type: Date, required: true}
});

module.exports = mongoose.model('Driver', driverSchema);

const mongoose = require('mongoose');

const systemInfoSchema = new mongoose.Schema({
    manufacturer: String,
    Model: String,
    Serial_Number: String,
    ipAdd: String
    // Add additional fields as necessary

});

const SystemInfo = mongoose.model('SystemInfo', systemInfoSchema);

module.exports = SystemInfo;

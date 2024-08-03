const mongoose = require('mongoose');

const statusInfoSchema = new mongoose.Schema({
    status: {
        type: String,
        required: true
    }
});

module.exports = mongoose.model('StatusInfo', statusInfoSchema);
const mongoose = require('mongoose');

// Define the Tester schema
const testerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }
});

// Create the Tester model based on the schema
const Tester = mongoose.model('Tester', testerSchema);

module.exports = Tester;

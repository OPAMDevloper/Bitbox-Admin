const mongoose = require('mongoose');

const dynamicFieldSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const DynamicField = mongoose.model('DynamicField', dynamicFieldSchema);

module.exports = DynamicField;
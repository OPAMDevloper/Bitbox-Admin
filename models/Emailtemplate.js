const mongoose = require('mongoose');
const emailTemplateSchema = new mongoose.Schema({
    name: String, // A name or identifier for the template
    subject: String,
    htmlContent: String, // HTML content with placeholders
});

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);


module.exports = EmailTemplate;
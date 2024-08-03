const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const loginSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessTo: {
    type: [String],
    required: true
  },
  otp: {
    type: String
  }
});

module.exports = mongoose.model('Login', loginSchema);

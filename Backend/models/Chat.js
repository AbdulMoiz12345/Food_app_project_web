const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  foodName: { type: String, required: true },
  sender: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const Chat = mongoose.model('Chat', ChatSchema);

module.exports = Chat;

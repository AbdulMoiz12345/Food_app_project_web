const mongoose = require('mongoose');

const InWayOrderSchema = new mongoose.Schema({
  riderId: { type: String, required: true },
  buyerId: { type: String, required: true },
  sellerId:{ type: String, required: true },
  foodName: { type: String, required: true },
  orderId: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InWayOrder', InWayOrderSchema);

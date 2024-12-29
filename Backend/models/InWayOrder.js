const mongoose = require('mongoose');

const InWayOrderSchema = new mongoose.Schema({
  riderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{
    foodName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'MadeOrder', required: true }, // Reference to MadeOrder for each item
  }],
  createdAt: { type: Date, default: Date.now },
});

const InWayOrder = mongoose.model('InWayOrder', InWayOrderSchema);

module.exports = InWayOrder;

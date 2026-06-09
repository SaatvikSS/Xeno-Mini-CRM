const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  order_number: { type: String, required: true, unique: true },
  items: [orderItemSchema],
  total_amount: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'returned', 'pending'],
    default: 'completed',
  },
  ordered_at: { type: Date, required: true, index: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', orderSchema);

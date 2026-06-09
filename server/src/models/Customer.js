const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, required: true },
  channel_preferences: {
    type: [String],
    enum: ['whatsapp', 'sms', 'email', 'rcs'],
    default: ['email']
  },
  tags: { type: [String], default: [] },
  total_spend: { type: Number, default: 0, index: true },
  total_orders: { type: Number, default: 0 },
  last_order_date: { type: Date, index: true },
  first_order_date: { type: Date },
  city: { type: String, index: true },
  age_group: {
    type: String,
    enum: ['18-24', '25-34', '35-44', '45-54', '55+'],
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer_not_to_say'],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for orders
customerSchema.virtual('orders', {
  ref: 'Order',
  localField: '_id',
  foreignField: 'customer_id',
});

// Index for segment queries
customerSchema.index({ total_spend: 1, last_order_date: 1, city: 1 });
customerSchema.index({ tags: 1 });

module.exports = mongoose.model('Customer', customerSchema);

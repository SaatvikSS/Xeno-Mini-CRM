const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field: {
    type: String,
    required: true,
    enum: [
      'total_spend', 'total_orders', 'last_order_date', 'first_order_date',
      'city', 'tags', 'channel_preferences', 'age_group', 'gender',
      'days_since_last_order',
    ],
  },
  operator: {
    type: String,
    required: true,
    enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'between', 'in', 'not_in'],
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { _id: false });

const segmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  rules: {
    operator: { type: String, enum: ['AND', 'OR'], default: 'AND' },
    conditions: [conditionSchema],
  },
  customer_count: { type: Number, default: 0 },
  ai_generated: { type: Boolean, default: false },
  natural_language_query: { type: String, default: '' },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Segment', segmentSchema);

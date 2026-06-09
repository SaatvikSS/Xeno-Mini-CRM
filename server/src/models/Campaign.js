const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true },
  segment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Segment',
    required: true,
  },
  channel: {
    type: String,
    required: true,
    enum: ['whatsapp', 'sms', 'email', 'rcs'],
  },
  message_template: { type: String, required: true },
  subject: { type: String, default: '' }, // for email
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'completed'],
    default: 'draft',
  },
  stats: {
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    delivered: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    opened: { type: Number, default: 0 },
    read: { type: Number, default: 0 },
    clicked: { type: Number, default: 0 },
  },
  ai_generated: { type: Boolean, default: false },
  scheduled_at: { type: Date },
  sent_at: { type: Date },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Campaign', campaignSchema);

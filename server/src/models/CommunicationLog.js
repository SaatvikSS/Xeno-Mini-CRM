const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const communicationLogSchema = new mongoose.Schema({
  campaign_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true,
    index: true,
  },
  customer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true,
  },
  channel: {
    type: String,
    required: true,
    enum: ['whatsapp', 'sms', 'email', 'rcs'],
  },
  personalised_message: { type: String, required: true },
  subject: { type: String, default: '' },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked'],
    default: 'queued',
  },
  status_history: [statusHistorySchema],
  vendor_message_id: { type: String, index: true },
  failure_reason: { type: String, default: '' },
}, {
  timestamps: true,
});

// Compound index for efficient campaign stats aggregation
communicationLogSchema.index({ campaign_id: 1, status: 1 });

module.exports = mongoose.model('CommunicationLog', communicationLogSchema);

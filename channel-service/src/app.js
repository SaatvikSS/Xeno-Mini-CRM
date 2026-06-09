const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const { v4: uuidv4 } = require('crypto');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// ─── In-memory tracking ───
const pendingMessages = new Map();

// ─── Simulation Config ───
const CHANNEL_CONFIG = {
  whatsapp: { deliveryRate: 0.94, openRate: 0.72, readRate: 0.55, clickRate: 0.18, deliveryDelay: [500, 3000], engagementDelay: [2000, 15000] },
  sms:      { deliveryRate: 0.91, openRate: 0.35, readRate: 0.25, clickRate: 0.08, deliveryDelay: [300, 2000], engagementDelay: [3000, 20000] },
  email:    { deliveryRate: 0.88, openRate: 0.42, readRate: 0.30, clickRate: 0.12, deliveryDelay: [1000, 5000], engagementDelay: [5000, 30000] },
  rcs:      { deliveryRate: 0.85, openRate: 0.60, readRate: 0.45, clickRate: 0.15, deliveryDelay: [500, 4000], engagementDelay: [2000, 20000] },
};

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVendorId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Simulate delivery lifecycle ───
async function simulateDelivery(logId, callbackUrl, channel) {
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.email;
  const vendorId = generateVendorId();

  // Helper to send callback
  async function sendCallback(status, extras = {}) {
    try {
      await axios.post(callbackUrl, {
        log_id: logId,
        vendor_message_id: vendorId,
        status,
        timestamp: new Date().toISOString(),
        ...extras,
      }, { timeout: 10000 });
    } catch (err) {
      console.error(`⚠️  Callback failed for ${logId} -> ${status}: ${err.message}`);
    }
  }

  // Step 1: Delivery (after random delay)
  const deliveryDelay = randomDelay(...config.deliveryDelay);
  await new Promise(r => setTimeout(r, deliveryDelay));

  if (Math.random() > config.deliveryRate) {
    // Failed delivery
    await sendCallback('failed', { failure_reason: getRandomFailureReason() });
    return;
  }

  await sendCallback('delivered');

  // Step 2: Opened (after engagement delay)
  if (Math.random() < config.openRate) {
    const openDelay = randomDelay(...config.engagementDelay);
    await new Promise(r => setTimeout(r, openDelay));
    await sendCallback('opened');

    // Step 3: Read
    if (Math.random() < config.readRate) {
      const readDelay = randomDelay(500, 5000);
      await new Promise(r => setTimeout(r, readDelay));
      await sendCallback('read');

      // Step 4: Clicked
      if (Math.random() < config.clickRate) {
        const clickDelay = randomDelay(500, 3000);
        await new Promise(r => setTimeout(r, clickDelay));
        await sendCallback('clicked');
      }
    }
  }
}

function getRandomFailureReason() {
  const reasons = [
    'Phone number not on WhatsApp',
    'Invalid phone number format',
    'Recipient has blocked marketing messages',
    'Network timeout — message not delivered',
    'Carrier rejected message',
    'Email bounced — invalid address',
    'RCS not supported on device',
    'Rate limit exceeded',
  ];
  return reasons[Math.floor(Math.random() * reasons.length)];
}

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'xeno-channel-service',
    timestamp: new Date().toISOString(),
    pending: pendingMessages.size,
  });
});

// ─── POST /api/send — receive message send request from CRM ───
app.post('/api/send', (req, res) => {
  const { log_id, campaign_id, recipient, message, channel, callback_url } = req.body;

  if (!log_id || !callback_url || !channel) {
    return res.status(400).json({ error: 'Missing required fields: log_id, callback_url, channel' });
  }

  const vendorMessageId = generateVendorId();

  // Track the message
  pendingMessages.set(log_id, {
    vendorMessageId,
    channel,
    recipient,
    receivedAt: new Date(),
  });

  // Start async simulation (non-blocking)
  simulateDelivery(log_id, callback_url, channel)
    .finally(() => pendingMessages.delete(log_id));

  // Respond immediately with acceptance
  res.json({
    status: 'accepted',
    vendor_message_id: vendorMessageId,
    log_id,
  });
});

// ─── GET /api/status — check pending messages ───
app.get('/api/status', (req, res) => {
  res.json({
    pending: pendingMessages.size,
    messages: Array.from(pendingMessages.entries()).map(([id, data]) => ({
      log_id: id,
      channel: data.channel,
      received_at: data.receivedAt,
    })),
  });
});

// ─── Error handling ───
app.use((err, req, res, next) => {
  console.error('❌ Channel Service Error:', err);
  res.status(500).json({ error: err.message });
});

module.exports = app;

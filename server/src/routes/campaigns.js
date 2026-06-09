const express = require('express');
const router = express.Router();
const Campaign = require('../models/Campaign');
const Segment = require('../models/Segment');
const CommunicationLog = require('../models/CommunicationLog');
const { evaluateSegment } = require('../services/segmentEngine');
const axios = require('axios');

const CHANNEL_SERVICE_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:3001';
const CRM_CALLBACK_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:3000';

// GET /api/campaigns — list campaigns
router.get('/', async (req, res, next) => {
  try {
    const campaigns = await Campaign.find()
      .sort('-createdAt')
      .populate('segment_id', 'name customer_count')
      .lean();
    res.json(campaigns);
  } catch (err) { next(err); }
});

// GET /api/campaigns/:id — single campaign with details
router.get('/:id', async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('segment_id')
      .lean();
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    // Get communication log stats
    const logs = await CommunicationLog.find({ campaign_id: campaign._id })
      .populate('customer_id', 'name email phone')
      .sort('-createdAt')
      .lean();

    res.json({ ...campaign, logs });
  } catch (err) { next(err); }
});

// POST /api/campaigns — create campaign (draft)
router.post('/', async (req, res, next) => {
  try {
    const { name, segment_id, channel, message_template, subject, ai_generated } = req.body;
    
    const segment = await Segment.findById(segment_id);
    if (!segment) return res.status(404).json({ error: 'Segment not found' });

    const campaign = new Campaign({
      name,
      segment_id,
      channel,
      message_template,
      subject,
      ai_generated: ai_generated || false,
      status: 'draft',
      stats: { total: segment.customer_count },
    });
    await campaign.save();
    res.status(201).json(campaign);
  } catch (err) { next(err); }
});

// POST /api/campaigns/:id/send — execute a campaign
router.post('/:id/send', async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id).populate('segment_id');
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'draft') {
      return res.status(400).json({ error: 'Campaign already sent or sending' });
    }

    // Mark as sending
    campaign.status = 'sending';
    campaign.sent_at = new Date();
    await campaign.save();

    // Get all customers in the segment
    const customers = await evaluateSegment(campaign.segment_id.rules);

    // Update total count
    campaign.stats.total = customers.length;
    await campaign.save();

    // Create communication logs and dispatch to channel service
    const dispatchPromises = customers.map(async (customer) => {
      // Personalise message
      const personalised = campaign.message_template
        .replace(/\{\{name\}\}/gi, customer.name)
        .replace(/\{\{email\}\}/gi, customer.email)
        .replace(/\{\{city\}\}/gi, customer.city || '')
        .replace(/\{\{total_spend\}\}/gi, customer.total_spend?.toString() || '0')
        .replace(/\{\{first_name\}\}/gi, customer.name.split(' ')[0]);

      // Create log entry
      const log = new CommunicationLog({
        campaign_id: campaign._id,
        customer_id: customer._id,
        channel: campaign.channel,
        personalised_message: personalised,
        subject: campaign.subject || '',
        status: 'queued',
        status_history: [{ status: 'queued', timestamp: new Date() }],
      });
      await log.save();

      // Send to channel service (fire and forget, but track errors)
      try {
        const response = await axios.post(`${CHANNEL_SERVICE_URL}/api/send`, {
          log_id: log._id.toString(),
          campaign_id: campaign._id.toString(),
          recipient: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
          message: personalised,
          subject: campaign.subject || '',
          channel: campaign.channel,
          callback_url: `${CRM_CALLBACK_URL}/api/receipts`,
        }, { timeout: 10000 });

        // Update log with vendor message ID
        log.vendor_message_id = response.data.vendor_message_id;
        log.status = 'sent';
        log.status_history.push({ status: 'sent', timestamp: new Date() });
        await log.save();
      } catch (sendError) {
        log.status = 'failed';
        log.failure_reason = sendError.message;
        log.status_history.push({ status: 'failed', timestamp: new Date() });
        await log.save();
      }

      return log;
    });

    // Process all dispatches (in batches to avoid overwhelming)
    const BATCH_SIZE = 50;
    for (let i = 0; i < dispatchPromises.length; i += BATCH_SIZE) {
      await Promise.all(dispatchPromises.slice(i, i + BATCH_SIZE));
    }

    // Recalculate stats
    const statusCounts = await CommunicationLog.aggregate([
      { $match: { campaign_id: campaign._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { total: customers.length, sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0 };
    statusCounts.forEach(({ _id, count }) => {
      if (stats.hasOwnProperty(_id)) stats[_id] = count;
    });
    campaign.stats = stats;
    campaign.status = 'sent';
    await campaign.save();

    res.json({ message: 'Campaign sent', campaign });
  } catch (err) { next(err); }
});

// GET /api/campaigns/:id/stats — real-time stats
router.get('/:id/stats', async (req, res, next) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const statusCounts = await CommunicationLog.aggregate([
      { $match: { campaign_id: campaign._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const stats = { total: campaign.stats.total, sent: 0, delivered: 0, failed: 0, opened: 0, read: 0, clicked: 0 };
    statusCounts.forEach(({ _id, count }) => {
      if (stats.hasOwnProperty(_id)) stats[_id] = count;
    });

    // Update campaign stats
    campaign.stats = stats;
    
    // Check if all communications are in terminal state
    const terminalCount = stats.delivered + stats.failed + stats.opened + stats.read + stats.clicked;
    if (terminalCount >= stats.total && campaign.status === 'sent') {
      campaign.status = 'completed';
    }
    await campaign.save();

    res.json(stats);
  } catch (err) { next(err); }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    await CommunicationLog.deleteMany({ campaign_id: campaign._id });
    res.json({ message: 'Campaign deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

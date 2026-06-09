const express = require('express');
const router = express.Router();
const CommunicationLog = require('../models/CommunicationLog');
const Campaign = require('../models/Campaign');

// Valid status transitions — enforce lifecycle ordering
const STATUS_ORDER = ['queued', 'sent', 'delivered', 'failed', 'opened', 'read', 'clicked'];

function isValidTransition(currentStatus, newStatus) {
  // Failed is a terminal state from sent
  if (currentStatus === 'failed') return false;
  
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  
  // Can't go backwards (except failed can come from sent)
  if (newStatus === 'failed' && currentStatus === 'sent') return true;
  
  return newIdx > currentIdx;
}

// POST /api/receipts — receive delivery status callbacks from channel service
router.post('/', async (req, res, next) => {
  try {
    const { log_id, vendor_message_id, status, timestamp, failure_reason } = req.body;

    if (!log_id || !status) {
      return res.status(400).json({ error: 'log_id and status are required' });
    }

    // Find the communication log
    const log = await CommunicationLog.findById(log_id);
    if (!log) {
      return res.status(404).json({ error: 'Communication log not found' });
    }

    // Validate status transition
    if (!isValidTransition(log.status, status)) {
      return res.status(200).json({ 
        message: 'Status transition ignored',
        current: log.status,
        attempted: status,
      });
    }

    // Update log
    log.status = status;
    log.status_history.push({ 
      status, 
      timestamp: timestamp ? new Date(timestamp) : new Date() 
    });
    if (vendor_message_id) log.vendor_message_id = vendor_message_id;
    if (failure_reason) log.failure_reason = failure_reason;
    await log.save();

    // Update campaign stats incrementally
    const campaign = await Campaign.findById(log.campaign_id);
    if (campaign) {
      // Recalculate stats from aggregation for accuracy
      const statusCounts = await CommunicationLog.aggregate([
        { $match: { campaign_id: campaign._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]);

      const stats = { 
        total: campaign.stats.total, 
        sent: 0, delivered: 0, failed: 0, 
        opened: 0, read: 0, clicked: 0 
      };
      statusCounts.forEach(({ _id, count }) => {
        if (stats.hasOwnProperty(_id)) stats[_id] = count;
      });
      campaign.stats = stats;
      await campaign.save();
    }

    res.json({ message: 'Receipt processed', log_id, status });
  } catch (err) { next(err); }
});

module.exports = router;

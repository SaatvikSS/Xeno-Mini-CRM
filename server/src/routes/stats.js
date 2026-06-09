const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Campaign = require('../models/Campaign');
const CommunicationLog = require('../models/CommunicationLog');
const Order = require('../models/Order');

router.get('/dashboard', async (req, res, next) => {
  try {
    const [
      totalCustomers, totalOrders, totalCampaigns, activeCampaigns,
      revenueResult, recentCampaigns, topCities, channelPerformance,
    ] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments(),
      Campaign.countDocuments(),
      Campaign.countDocuments({ status: { $in: ['sending', 'sent'] } }),
      Order.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$total_amount' } } },
      ]),
      Campaign.find().sort('-createdAt').limit(5).populate('segment_id', 'name').lean(),
      Customer.aggregate([
        { $group: { _id: '$city', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      CommunicationLog.aggregate([
        { $group: { 
          _id: '$channel', 
          total: { $sum: 1 },
          delivered: { $sum: { $cond: [{ $in: ['$status', ['delivered', 'opened', 'read', 'clicked']] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $in: ['$status', ['opened', 'read', 'clicked']] }, 1, 0] } },
          clicked: { $sum: { $cond: [{ $eq: ['$status', 'clicked'] }, 1, 0] } },
        }},
      ]),
    ]);

    const tagDistribution = await Customer.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      overview: {
        totalCustomers, totalOrders, totalCampaigns, activeCampaigns,
        totalRevenue: revenueResult[0]?.total || 0,
      },
      recentCampaigns, topCities, channelPerformance, tagDistribution,
    });
  } catch (err) { next(err); }
});

module.exports = router;

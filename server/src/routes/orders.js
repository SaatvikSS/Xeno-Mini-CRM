const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// GET /api/orders — list orders with pagination
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, customer_id, status } = req.query;
    const filter = {};
    if (customer_id) filter.customer_id = customer_id;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      Order.find(filter).sort('-ordered_at').skip(skip).limit(Number(limit)).populate('customer_id', 'name email').lean(),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) { next(err); }
});

module.exports = router;

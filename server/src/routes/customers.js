const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const multer = require('multer');
const csv = require('csv-parser');
const stream = require('stream');

const upload = multer({ storage: multer.memoryStorage() });

// GET /api/customers — list all customers with pagination, search, and filters
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      city,
      tag,
      sort = '-updatedAt',
      minSpend,
      maxSpend,
    } = req.query;

    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (city) filter.city = city;
    if (tag) filter.tags = { $in: [tag] };
    if (minSpend || maxSpend) {
      filter.total_spend = {};
      if (minSpend) filter.total_spend.$gte = Number(minSpend);
      if (maxSpend) filter.total_spend.$lte = Number(maxSpend);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      Customer.find(filter).sort(sort).skip(skip).limit(Number(limit)).lean(),
      Customer.countDocuments(filter),
    ]);

    res.json({
      customers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) { next(err); }
});

// GET /api/customers/cities — distinct cities
router.get('/cities', async (req, res, next) => {
  try {
    const cities = await Customer.distinct('city');
    res.json(cities.sort());
  } catch (err) { next(err); }
});

// GET /api/customers/tags — distinct tags
router.get('/tags', async (req, res, next) => {
  try {
    const tags = await Customer.distinct('tags');
    res.json(tags.sort());
  } catch (err) { next(err); }
});

// GET /api/customers/:id — single customer with orders
router.get('/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).lean();
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = await Order.find({ customer_id: customer._id })
      .sort('-ordered_at')
      .lean();

    res.json({ ...customer, orders });
  } catch (err) { next(err); }
});

// POST /api/customers — create single customer
router.post('/', async (req, res, next) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.status(201).json(customer);
  } catch (err) { next(err); }
});

// POST /api/customers/bulk — bulk import
router.post('/bulk', async (req, res, next) => {
  try {
    const { customers } = req.body;
    if (!Array.isArray(customers) || customers.length === 0) {
      return res.status(400).json({ error: 'Provide an array of customers' });
    }
    const result = await Customer.insertMany(customers, { ordered: false });
    res.status(201).json({ inserted: result.length });
  } catch (err) { next(err); }
});


// POST /api/customers/upload — upload CSV
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const results = [];
    const bufferStream = new stream.PassThrough();
    bufferStream.end(req.file.buffer);

    bufferStream
      .pipe(csv())
      .on('data', (data) => {
        const customer = {
          name: data.name || data.Name || '',
          email: data.email || data.Email || '',
          phone: data.phone || data.Phone || '',
          city: data.city || data.City || '',
          total_spend: Number(data.total_spend || data['Total Spend'] || data.spend || 0),
          orders_count: Number(data.orders_count || data['Orders Count'] || data.orders || 0),
          last_order_date: data.last_order_date || data['Last Order Date'] ? new Date(data.last_order_date || data['Last Order Date']) : new Date(),
          tags: (data.tags || data.Tags || '').split(',').map(t => t.trim()).filter(Boolean),
        };
        if (customer.name && customer.email) {
          results.push(customer);
        }
      })
      .on('end', async () => {
        try {
          if (results.length === 0) return res.status(400).json({ error: 'No valid customers found in CSV' });
          const inserted = await Customer.insertMany(results, { ordered: false });
          res.status(201).json({ inserted: inserted.length });
        } catch (err) {
          // Ignore duplicate key errors from insertMany if any
          if (err.code === 11000 && err.insertedDocs) {
            return res.status(201).json({ inserted: err.insertedDocs.length });
          }
          next(err);
        }
      });
  } catch (err) { next(err); }
});

module.exports = router;

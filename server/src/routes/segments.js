const express = require('express');
const router = express.Router();
const Segment = require('../models/Segment');
const { evaluateSegment, getSegmentCount } = require('../services/segmentEngine');

// GET /api/segments — list all segments
router.get('/', async (req, res, next) => {
  try {
    const segments = await Segment.find().sort('-createdAt').lean();
    res.json(segments);
  } catch (err) { next(err); }
});

// GET /api/segments/:id — single segment
router.get('/:id', async (req, res, next) => {
  try {
    const segment = await Segment.findById(req.params.id).lean();
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    res.json(segment);
  } catch (err) { next(err); }
});

// POST /api/segments — create segment
router.post('/', async (req, res, next) => {
  try {
    const { name, description, rules, ai_generated, natural_language_query } = req.body;
    
    // Evaluate count
    const customer_count = await getSegmentCount(rules);

    const segment = new Segment({
      name,
      description,
      rules,
      customer_count,
      ai_generated: ai_generated || false,
      natural_language_query: natural_language_query || '',
    });
    await segment.save();
    res.status(201).json(segment);
  } catch (err) { next(err); }
});

// POST /api/segments/preview — preview matching customers without saving
router.post('/preview', async (req, res, next) => {
  try {
    const { rules, limit = 10 } = req.body;
    const [customers, count] = await Promise.all([
      evaluateSegment(rules, { limit: Number(limit) }),
      getSegmentCount(rules),
    ]);
    res.json({ customers, count });
  } catch (err) { next(err); }
});

// GET /api/segments/:id/customers — get customers in a segment
router.get('/:id/customers', async (req, res, next) => {
  try {
    const segment = await Segment.findById(req.params.id);
    if (!segment) return res.status(404).json({ error: 'Segment not found' });

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [customers, count] = await Promise.all([
      evaluateSegment(segment.rules, { limit: Number(limit), skip }),
      getSegmentCount(segment.rules),
    ]);

    res.json({
      customers,
      pagination: { page: Number(page), limit: Number(limit), total: count, pages: Math.ceil(count / Number(limit)) },
    });
  } catch (err) { next(err); }
});

// PUT /api/segments/:id — update segment
router.put('/:id', async (req, res, next) => {
  try {
    const { name, description, rules } = req.body;
    const customer_count = rules ? await getSegmentCount(rules) : undefined;

    const update = { name, description, rules };
    if (customer_count !== undefined) update.customer_count = customer_count;

    const segment = await Segment.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    res.json(segment);
  } catch (err) { next(err); }
});

// DELETE /api/segments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const segment = await Segment.findByIdAndDelete(req.params.id);
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    res.json({ message: 'Segment deleted' });
  } catch (err) { next(err); }
});

module.exports = router;

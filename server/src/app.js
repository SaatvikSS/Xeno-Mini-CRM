const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const segmentRoutes = require('./routes/segments');
const campaignRoutes = require('./routes/campaigns');
const receiptRoutes = require('./routes/receipts');
const aiRoutes = require('./routes/ai');
const statsRoutes = require('./routes/stats');

const app = express();

// ─── Middleware ───
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ───
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'xeno-crm-api', timestamp: new Date().toISOString() });
});

// ─── Routes ───
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/receipts', receiptRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/stats', statsRoutes);

// ─── Error Handling ───
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── 404 Handler ───
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

module.exports = app;

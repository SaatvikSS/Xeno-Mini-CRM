require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectDB();
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Xeno CRM API running on port ${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health\n`);
  });
}

startServer().catch(err => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

/**
 * Seed Script for Brew & Co. — Premium D2C Coffee Brand
 * 
 * Generates realistic customer personas, order histories, and product catalog.
 * Run with: node src/seed/seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xeno-crm';

// ─── Product Catalog ───
const PRODUCTS = [
  { name: 'Single Origin Ethiopia Yirgacheffe (250g)', price: 799 },
  { name: 'House Blend Dark Roast (500g)', price: 1199 },
  { name: 'Cold Brew Concentrate (1L)', price: 599 },
  { name: 'Matcha Latte Mix (200g)', price: 899 },
  { name: 'Espresso Capsules (20-pack)', price: 1499 },
  { name: 'Pour Over Dripper — Ceramic', price: 2499 },
  { name: 'French Press — Copper Edition', price: 3499 },
  { name: 'Travel Mug — Insulated 350ml', price: 1299 },
  { name: 'Subscription Box — Monthly Explorer', price: 1999 },
  { name: 'Gift Hamper — The Connoisseur', price: 4999 },
  { name: 'Decaf Colombian Supremo (250g)', price: 849 },
  { name: 'Oat Milk Barista Blend (1L)', price: 349 },
  { name: 'Manual Coffee Grinder — Burr', price: 2999 },
  { name: 'Iced Coffee Kit — Starter Pack', price: 1599 },
  { name: 'Flavoured Syrup Set (3-pack)', price: 699 },
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
  'Chandigarh', 'Kochi', 'Goa', 'Indore', 'Noida',
];

const FIRST_NAMES_M = [
  'Aarav', 'Vivaan', 'Aditya', 'Rohan', 'Arjun', 'Karan', 'Rahul', 'Nikhil',
  'Siddharth', 'Vikram', 'Amit', 'Pranav', 'Dev', 'Ishaan', 'Yash', 'Sahil',
  'Rishi', 'Kabir', 'Dhruv', 'Ansh', 'Varun', 'Kunal', 'Manish', 'Rajat',
  'Tarun', 'Akash', 'Harsh', 'Gaurav', 'Saurabh', 'Mohit',
];

const FIRST_NAMES_F = [
  'Ananya', 'Priya', 'Sneha', 'Ishita', 'Kavya', 'Riya', 'Pooja', 'Neha',
  'Aditi', 'Shreya', 'Meera', 'Tanya', 'Nisha', 'Sakshi', 'Divya', 'Kriti',
  'Aisha', 'Zara', 'Simran', 'Deepika', 'Palak', 'Ritika', 'Swati', 'Tanvi',
  'Anjali', 'Bhavna', 'Charvi', 'Disha', 'Esha', 'Falguni',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Patel', 'Mehta', 'Shah',
  'Reddy', 'Nair', 'Iyer', 'Joshi', 'Desai', 'Rao', 'Chopra', 'Malhotra',
  'Bhat', 'Kapoor', 'Agarwal', 'Banerjee', 'Sinha', 'Pillai', 'Menon',
  'Choudhury', 'Saxena', 'Tiwari', 'Mishra', 'Pandey', 'Chauhan', 'Thakur',
];

const AGE_GROUPS = ['18-24', '25-34', '35-44', '45-54', '55+'];
const CHANNELS = ['whatsapp', 'sms', 'email', 'rcs'];

// ─── Helpers ───
function random(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomDate(startDays, endDays) {
  const now = new Date();
  const start = new Date(now.getTime() - startDays * 86400000);
  const end = new Date(now.getTime() - endDays * 86400000);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function generateCustomer(index) {
  const isMale = Math.random() > 0.5;
  const firstName = isMale ? random(FIRST_NAMES_M) : random(FIRST_NAMES_F);
  const lastName = random(LAST_NAMES);
  const name = `${firstName} ${lastName}`;
  const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@${random(['gmail.com', 'outlook.com', 'yahoo.com', 'icloud.com'])}`;
  const phone = `+91${randomInt(7000000000, 9999999999)}`;
  const city = random(CITIES);
  const ageGroup = random(AGE_GROUPS);

  // Determine channel preferences (1-3 channels)
  const numChannels = randomInt(1, 3);
  const shuffled = [...CHANNELS].sort(() => Math.random() - 0.5);
  const channelPrefs = shuffled.slice(0, numChannels);

  return {
    name,
    email,
    phone,
    city,
    age_group: ageGroup,
    gender: isMale ? 'male' : 'female',
    channel_preferences: channelPrefs,
    tags: [],
    total_spend: 0,
    total_orders: 0,
    last_order_date: null,
    first_order_date: null,
  };
}

function generateOrders(customerId, count) {
  const orders = [];
  let totalSpend = 0;
  let firstDate = new Date();
  let lastDate = new Date(0);

  for (let i = 0; i < count; i++) {
    const numItems = randomInt(1, 4);
    const items = [];
    let orderTotal = 0;

    for (let j = 0; j < numItems; j++) {
      const product = random(PRODUCTS);
      const qty = randomInt(1, 3);
      items.push({
        product_name: product.name,
        quantity: qty,
        price: product.price,
      });
      orderTotal += product.price * qty;
    }

    const orderDate = randomDate(365, 1); // within last year
    const statuses = ['completed', 'completed', 'completed', 'completed', 'cancelled', 'returned'];

    if (orderDate < firstDate) firstDate = orderDate;
    if (orderDate > lastDate) lastDate = orderDate;

    const status = random(statuses);
    if (status === 'completed') totalSpend += orderTotal;

    orders.push({
      customer_id: customerId,
      order_number: `BRW-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      items,
      total_amount: orderTotal,
      status,
      ordered_at: orderDate,
    });
  }

  return { orders, totalSpend, firstDate, lastDate };
}

function assignTags(customer) {
  const tags = [];
  
  if (customer.total_spend > 15000) tags.push('vip');
  if (customer.total_spend > 8000) tags.push('high-value');
  if (customer.total_orders >= 5) tags.push('loyal');
  if (customer.total_orders === 1) tags.push('one-time');
  
  // Churning: no order in last 60 days
  if (customer.last_order_date) {
    const daysSince = Math.floor((Date.now() - customer.last_order_date.getTime()) / 86400000);
    if (daysSince > 60) tags.push('churning');
    if (daysSince > 120) tags.push('dormant');
    if (daysSince <= 14) tags.push('recent');
  }

  if (customer.age_group === '18-24') tags.push('gen-z');
  if (['25-34'].includes(customer.age_group)) tags.push('millennial');

  return tags;
}

// ─── Main Seed Function ───
async function seed() {
  console.log('🌱 Starting seed process for Brew & Co...\n');

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // Clear existing data
  await Promise.all([
    Customer.deleteMany({}),
    Order.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data\n');

  const CUSTOMER_COUNT = 500;
  const customers = [];
  const allOrders = [];

  console.log(`👥 Generating ${CUSTOMER_COUNT} customers...`);

  for (let i = 0; i < CUSTOMER_COUNT; i++) {
    const customerData = generateCustomer(i);
    const customer = new Customer(customerData);
    await customer.save();

    // Each customer gets 0-12 orders, weighted towards 1-5
    const orderCount = Math.random() < 0.05 ? 0 : randomInt(1, Math.random() < 0.8 ? 5 : 12);
    
    if (orderCount > 0) {
      const { orders, totalSpend, firstDate, lastDate } = generateOrders(customer._id, orderCount);
      
      customer.total_spend = totalSpend;
      customer.total_orders = orderCount;
      customer.first_order_date = firstDate;
      customer.last_order_date = lastDate;
      customer.tags = assignTags(customer);
      await customer.save();

      allOrders.push(...orders);
    }

    customers.push(customer);
    
    if ((i + 1) % 100 === 0) {
      console.log(`  ✓ ${i + 1}/${CUSTOMER_COUNT} customers created`);
    }
  }

  // Bulk insert orders
  console.log(`\n📦 Inserting ${allOrders.length} orders...`);
  await Order.insertMany(allOrders, { ordered: false });

  // Print summary
  const tagCounts = {};
  customers.forEach(c => c.tags.forEach(t => {
    tagCounts[t] = (tagCounts[t] || 0) + 1;
  }));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ SEED COMPLETE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`👥 Customers: ${customers.length}`);
  console.log(`📦 Orders: ${allOrders.length}`);
  console.log('\n🏷️  Tag Distribution:');
  Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).forEach(([tag, count]) => {
    console.log(`   ${tag}: ${count}`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});

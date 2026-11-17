const mongoose = require('mongoose');

async function initMongo() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuskart';
  await mongoose.connect(uri);
  console.log('MongoDB ready');
}

module.exports = { initMongo };

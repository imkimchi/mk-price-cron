require('dotenv').config();
const mongoose = require('mongoose');
const { createIndexes } = require('./createIndexes');

const MONGO_URI =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  'mongodb+srv://kry:rpli5Fu0MuVNXeaA@mkcluster.r3nthqr.mongodb.net/?retryWrites=true&w=majority&appName=mkcluster';

let _loggedAlreadyConnected = false;

async function databaseConnect() {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    if (!_loggedAlreadyConnected) {
      try {
        console.log('✅ Mongo already connected to db:', mongoose.connection.name);
      } catch (_) {}
      _loggedAlreadyConnected = true;
    }
    return mongoose.connection;
  }

  const options = {
    maxPoolSize: Number(process.env.MAX_POOL_SIZE || 10),
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    dbName: process.env.MONGODB_DB || 'test',
    maxConnecting: 1,
    appName: process.env.MONGODB_APPNAME || 'mk-price-history-worker'
  };

  await mongoose.connect(MONGO_URI, options);

  try {
    console.log('✅ Mongo connected to db:', mongoose.connection.name);
  } catch (_) {}

  try {
    await createIndexes();
  } catch (e) {
    console.error('Index creation failed:', e);
  }

  return mongoose.connection;
}

module.exports = databaseConnect;

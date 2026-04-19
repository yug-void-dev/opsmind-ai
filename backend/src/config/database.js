/**
 * OpsMind AI — MongoDB Atlas Connection
 *
 * Features:
 * - Retry logic on transient failures
 * - Connection event monitoring
 * - Proper timeout configuration for Atlas
 */

const mongoose = require('mongoose');
const logger   = require('../utils/logger');

const MONGO_OPTIONS = {
  serverSelectionTimeoutMS: 15_000, // Wait up to 15s for Atlas cold start
  socketTimeoutMS         : 45_000, // Close idle sockets after 45s
  maxPoolSize             : 10,     // Max 10 concurrent connections
  minPoolSize             : 2,      // Keep at least 2 warm
  heartbeatFrequencyMS    : 10_000, // Ping every 10s
  retryWrites             : true,
  w                       : 'majority',
};

const connectDB = async (retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
      logger.info(`✅ MongoDB Atlas connected: ${conn.connection.host}`);

      // Monitor connection health
      mongoose.connection.on('error',        (err) => logger.error(`MongoDB error: ${err.message}`));
      mongoose.connection.on('disconnected', ()    => logger.warn('MongoDB disconnected'));
      mongoose.connection.on('reconnected',  ()    => logger.info('MongoDB reconnected'));

      return conn;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('All MongoDB connection attempts exhausted. Exiting.');
        process.exit(1);
      }
      // Exponential backoff: 2s, 4s, 8s
      const delay = Math.pow(2, attempt) * 1000;
      logger.info(`Retrying in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
};

module.exports = connectDB;

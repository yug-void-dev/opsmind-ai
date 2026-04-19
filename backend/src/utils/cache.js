const NodeCache = require('node-cache');
const appConfig = require('../config/appConfig');
const logger = require('./logger');

const cache = new NodeCache({
  stdTTL: appConfig.cacheTTL,
  checkperiod: 120,
  useClones: false,
});

/**
 * Generate a deterministic cache key from a query
 */
const buildQueryKey = (query, filters = {}) => {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
  const filterStr = JSON.stringify(filters);
  return `query:${Buffer.from(normalized + filterStr).toString('base64').slice(0, 64)}`;
};

const get = (key) => {
  try {
    return cache.get(key) || null;
  } catch (e) {
    logger.warn(`Cache get error: ${e.message}`);
    return null;
  }
};

const set = (key, value, ttl = appConfig.cacheTTL) => {
  try {
    cache.set(key, value, ttl);
  } catch (e) {
    logger.warn(`Cache set error: ${e.message}`);
  }
};

const del = (key) => {
  try {
    cache.del(key);
  } catch (e) {
    logger.warn(`Cache del error: ${e.message}`);
  }
};

const flush = () => {
  try {
    cache.flushAll();
    logger.info('Cache flushed');
  } catch (e) {
    logger.warn(`Cache flush error: ${e.message}`);
  }
};

const stats = () => cache.getStats();

module.exports = { get, set, del, flush, buildQueryKey, stats };

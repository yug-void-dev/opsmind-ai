const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { unauthorized, forbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verify JWT and attach user to req
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorized(res, 'No token provided. Authorization header must be: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return unauthorized(res, 'User no longer exists');
    if (!user.isActive) return forbidden(res, 'Account has been deactivated');

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token has expired. Please log in again');
    }
    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Invalid token');
    }
    logger.error(`Auth middleware error: ${error.message}`);
    return unauthorized(res, 'Authentication failed');
  }
};

/**
 * Role-based access control middleware factory
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return unauthorized(res);
    if (!roles.includes(req.user.role)) {
      return forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
  };
};

/**
 * Optional auth — attach user if token present, continue either way
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user?.isActive) req.user = user;
    }
  } catch {
    // Silently ignore invalid tokens for optional auth
  }
  next();
};

module.exports = { authenticate, authorize, optionalAuth };

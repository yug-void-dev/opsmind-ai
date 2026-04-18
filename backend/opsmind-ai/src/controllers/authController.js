const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, created, badRequest, unauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return badRequest(res, 'Email already registered');

    // Only allow admin creation if the requester is already an admin
    // (or if no users exist yet — first-user bootstrap)
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'admin' : role === 'admin' ? 'user' : role;

    const user = await User.create({ name, email, password, role: assignedRole });
    const token = signToken(user._id);

    logger.info(`New user registered: ${email} [${assignedRole}]`);

    return created(res, { token, user }, 'Registration successful');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return unauthorized(res, 'Invalid email or password');
    }

    if (!user.isActive) return unauthorized(res, 'Account deactivated. Contact admin.');

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);
    logger.info(`User logged in: ${email}`);

    return success(res, { token, user }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  return success(res, { user: req.user });
};

/**
 * POST /api/auth/admin/create  (admin only)
 */
const createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return badRequest(res, 'Email already registered');

    const user = await User.create({ name, email, password, role: 'admin' });
    const token = signToken(user._id);

    logger.info(`Admin user created: ${email} by ${req.user.email}`);
    return created(res, { token, user }, 'Admin user created');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe, createAdminUser };

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, created, badRequest, unauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const socketService = require('../services/socketService');
const { sendOTPMail } = require('../services/mailService');
const crypto = require('crypto');

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

    // Notify admins
    if (assignedRole === 'user') {
      await socketService.notifyAdmins({
        title: 'New user registered',
        message: `${name} (${email}) joined the application.`,
        type: 'user_registered',
        metadata: { userId: user._id, email }
      });
    }

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


/**
 * POST /api/auth/forgot-password
 * Sends a 6-digit OTP to the user's email
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // For security reasons, don't reveal if the user exists but return success anyway
      // However, in many corporate apps, it's better to be explicit or let the UI handle it.
      // We'll return success to prevent email enumeration.
      return success(res, null, 'If that email is registered, an OTP has been sent.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save to DB with 15 min expiry
    user.passwordResetOTP = otp;
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send Mail
    await sendOTPMail(email, otp);

    logger.info(`Forgot password OTP sent to ${email}`);
    return success(res, null, 'OTP sent to your email.');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-otp
 * Checks if the OTP is valid and not expired
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ 
      email, 
      passwordResetOTP: otp,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return badRequest(res, 'Invalid or expired OTP');
    }

    return success(res, null, 'OTP verified successfully');
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/reset-password
 * Updates the user's password if the OTP matches
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ 
      email, 
      passwordResetOTP: otp,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return badRequest(res, 'Invalid or expired OTP session');
    }

    // Set new password
    user.password = newPassword;
    // Clear OTP fields
    user.passwordResetOTP = undefined;
    user.passwordResetExpires = undefined;
    
    await user.save();

    logger.info(`Password reset successfully for ${email}`);
    return success(res, null, 'Password has been reset successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { 
  register, 
  login, 
  getMe, 
  createAdminUser,
  forgotPassword,
  verifyOTP,
  resetPassword
};

const express = require('express');
const router = express.Router();
const { 
  register, 
  login, 
  getMe, 
  createAdminUser,
  forgotPassword,
  verifyOTP,
  resetPassword 
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');

router.post('/register', validate(schemas.register), register);
router.post('/login', validate(schemas.login), login);
router.get('/me', authenticate, getMe);
router.post('/admin/create', authenticate, authorize('admin'), validate(schemas.register), createAdminUser);

// Password Reset Routes
router.post('/forgot-password', validate(schemas.forgotPassword), forgotPassword);
router.post('/verify-otp', validate(schemas.verifyOTP), verifyOTP);
router.post('/reset-password', validate(schemas.resetPassword), resetPassword);

module.exports = router;

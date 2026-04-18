const express = require('express');
const router = express.Router();
const { register, login, getMe, createAdminUser } = require('../controllers/authController');
const { authenticate, authorize } = require('../middlewares/auth');
const { validate, schemas } = require('../middlewares/validate');

router.post('/register', validate(schemas.register), register);
router.post('/login', validate(schemas.login), login);
router.get('/me', authenticate, getMe);
router.post('/admin/create', authenticate, authorize('admin'), validate(schemas.register), createAdminUser);

module.exports = router;

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate, authorize } = require('../middlewares/auth');

// All notification routes require authentication
router.use(authenticate);

router.get('/', notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllAsRead);
router.delete('/all', notificationController.deleteAllNotifications);
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;

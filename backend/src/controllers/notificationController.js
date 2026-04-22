const Notification = require('../models/Notification');
const { success, notFound } = require('../utils/apiResponse');

/**
 * GET /api/notifications
 * List notifications for the current user (admins see all admin-targeted ones)
 */
const listNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Filter by recipient role and optionally by recipient ID
    const filter = {
      recipientRole: req.user.role,
      $or: [
        { recipientId: req.user._id },
        { recipientId: null }
      ]
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    return success(res, { 
      notifications, 
      pagination: { total, page: parseInt(page), limit: parseInt(limit) },
      unreadCount
    }, 'Notifications retrieved');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) return notFound(res, 'Notification not found');

    notification.isRead = true;
    await notification.save();

    return success(res, notification, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for the current user
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const filter = {
      recipientRole: req.user.role,
      $or: [
        { recipientId: req.user._id },
        { recipientId: null }
      ],
      isRead: false
    };

    await Notification.updateMany(filter, { $set: { isRead: true } });

    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead
};

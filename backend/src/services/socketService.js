const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

let io;

const init = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*', // In production, replace with specific frontend URL
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error: No token provided'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('role');
      
      if (!user) return next(new Error('Authentication error: User not found'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user._id}, Role: ${socket.user.role})`);

    // Join room based on role
    socket.join(socket.user.role);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

/**
 * Send a notification to all admins and save to DB
 */
const notifyAdmins = async ({ title, message, type, metadata = {} }) => {
  try {
    // 1. Save to Database
    const notification = await Notification.create({
      title,
      message,
      type,
      recipientRole: 'admin',
      metadata,
    });

    // 2. Emit to connected admins
    if (io) {
      io.to('admin').emit('notification', notification);
      logger.info(`Notification sent to admins: ${title}`);
    } else {
      logger.warn('Socket.io not initialized, notification saved to DB only.');
    }

    return notification;
  } catch (err) {
    logger.error(`Error sending notification: ${err.message}`);
  }
};

/**
 * Emit a real-time activity event to admins
 */
const emitActivity = (activity) => {
  if (io) {
    io.to('admin').emit('new_activity', activity);
  }
};

module.exports = {
  init,
  getIO,
  notifyAdmins,
  emitActivity,
};

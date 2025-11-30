// src/utils/emitNotification.js
const NotificationModel = require('../models/notificationModel');
const redisClient = require('../config/redis');

const emitToTarget = async (io, identifier, type, notification) => {
  if (!io) return; // Fallback nếu dev mode không có io

  const idType = type === 'user' ? 'user_id' : 'session_key';
  const count = await NotificationModel.getUnreadCount(identifier, idType);
  const room = type === 'user' ? `user_${identifier}` : `guest_${identifier}`;

  io.to(room).emit('notification:new', { ...notification, newCount: count });
  io.to(room).emit('notification:count', { count });

  // Xóa cache cho target
  const cacheKey = type === 'user' ? `notification_count_${identifier}` : `notification_count_guest_${identifier}`;
  if (redisClient) await redisClient.del(cacheKey);
};

const emitGlobal = async (io, notification) => {
  if (!io) return;

  io.emit('notification:new', { ...notification, is_global: true });

  // Xóa toàn bộ cache như cũ
  if (redisClient) {
    const keys = await redisClient.keys('notification_count_*');
    if (keys.length > 0) await redisClient.del(...keys);
  }
};

module.exports = { emitToTarget, emitGlobal };
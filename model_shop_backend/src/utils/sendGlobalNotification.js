// src/utils/sendGlobalNotification.js
const db = require('../config/db');
const redisClient = require('../config/redis');
const { emitGlobal } = require('./emitNotification');

const sendGlobalNotification = async (message, type = 'events', link = null) => {
  let conn;
  try {
    conn = await db.getConnection();

    // Chèn 1 dòng duy nhất với is_global = 1
    const [result] = await conn.query(
      `INSERT INTO notifications 
       (user_id, session_key, message, link, type, is_global, created_at) 
       VALUES (NULL, NULL, ?, ?, ?, 1, NOW())`,
      [message, link, type]
    );
    const notificationId = result.insertId;

    // Emit global (đã xử lý cache trong emitGlobal)
    emitGlobal(global.io, { notification_id: notificationId, message, type, link, is_global: 1 });

    // Xóa cache fallback (nếu Redis thật)
    if (redisClient && redisClient.keys) {
      const keys = await redisClient.keys('notification_count_*');
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }

    console.log(`Global notification sent! ID: ${notificationId} – "${message}"`);
    return { success: true, notificationId };
  } catch (err) {
    console.error('sendGlobalNotification error:', err);
    return { success: false, error: err.message };
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { sendGlobalNotification };
// src/controllers/notificationController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const redisClient = require('../config/redis');

// Helper lấy identifier (user hoặc guest) – SỬA: Ưu tiên query params trước session
const getIdentifier = (req) => {
  // 1. Ưu tiên: đã login → dùng user_id từ session
  if (req.session.user_id) {
    return { user_id: req.session.user_id, session_key: null };
  }

  // 2. Guest: lấy session_key từ query → lưu vào session để dùng lại
  let session_key = req.query.session_key || req.body.session_key;

  // Nếu có truyền lên → lưu vào session để các request sau không cần truyền nữa
  if (session_key && !req.session.session_key) {
    req.session.session_key = session_key;
  }

  // Dùng cái đã lưu trong session (nếu đã có từ lần trước)
  session_key = req.session.session_key || session_key;

  return { user_id: null, session_key };
};

// Phần còn lại giữ nguyên (getNotifications, markNotificationsRead, getNotificationCount)
const getNotifications = async (req, res) => {
  const { user_id, session_key } = getIdentifier(req);
  if (!user_id && !session_key) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const identifier = user_id || session_key;
  const idType = user_id ? 'user_id' : 'session_key';

  const page = parseInt(req.query.page) || 1;
  const perPage = parseInt(req.query.perPage) || 10;
  const filter = req.query.filter || 'all';
  const typeFilter = req.query.type || 'all';

  let conn;
  try {
    conn = await db.getConnection();

    let query = `SELECT notification_id, type, message, link, data, is_global, is_read, read_at, created_at 
                 FROM notifications WHERE (${idType} = ? OR is_global = 1)`;
    let params = [identifier];

    if (filter === 'unread') query += ' AND is_read = 0';
    if (filter === 'read') query += ' AND is_read = 1';
    if (typeFilter !== 'all') {
      query += ' AND type = ?';
      params.push(typeFilter);
    }

    query += ' ORDER BY is_global DESC, created_at DESC LIMIT ?, ?';
    params.push((page - 1) * perPage, perPage);

    const [notifications] = await conn.query(query, params);

    let totalQuery = `SELECT COUNT(*) as total FROM notifications WHERE (${idType} = ? OR is_global = 1)`;
    let totalParams = [identifier];
    if (filter === 'unread') totalQuery += ' AND is_read = 0';
    if (filter === 'read') totalQuery += ' AND is_read = 1';
    if (typeFilter !== 'all') {
      totalQuery += ' AND type = ?';
      totalParams.push(typeFilter);
    }

    const [total] = await conn.query(totalQuery, totalParams);
    const totalPages = Math.ceil(total[0].total / perPage);

    res.json({ success: true, notifications, totalPages });
  } catch (error) {
    await logError('getNotifications error: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed' });
  } finally {
    if (conn) conn.release();
  }
};

const markNotificationsRead = async (req, res) => {
  const { user_id, session_key } = getIdentifier(req);
  if (!user_id && !session_key) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }

  const { notification_ids } = req.body;
  const identifier = user_id || session_key;
  const idType = user_id ? 'user_id' : 'session_key';
  const cacheKey = user_id ? `notification_count_${user_id}` : `notification_count_guest_${session_key}`;

  let conn;
  try {
    conn = await db.getConnection();
    let sql = `UPDATE notifications SET is_read = 1, read_at = NOW() WHERE (${idType} = ? OR is_global = 1)`;
    let params = [identifier];

    if (notification_ids !== 'all') {
      if (!Array.isArray(notification_ids) || notification_ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid ids' });
      }
      const placeholders = notification_ids.map(() => '?').join(',');
      sql += ` AND notification_id IN (${placeholders})`;
      params = [identifier, ...notification_ids];  // SỬA: Đặt identifier cuối cùng để tránh conflict với IN clause
    }

    await conn.query(sql, params);
    await redisClient.del(cacheKey);

    // Emit realtime update count sau mark read
    const io = require('../app').get('io');
    const { emitToTarget } = require('../utils/emitNotification');
    await emitToTarget(io, identifier, user_id ? 'user' : 'guest', {});

    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    await logError('markNotificationsRead: ' + err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const getNotificationCount = async (req, res) => {
  const { user_id, session_key } = getIdentifier(req); 
  if (!user_id && !session_key) return res.status(401).json({ count: 0 });

  const identifier = user_id || session_key;
  const idType = user_id ? 'user_id' : 'session_key';
  const cacheKey = user_id ? `notification_count_${user_id}` : `notification_count_guest_${session_key}`;

  let count = await redisClient.get(cacheKey);
  if (count === null) {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE (${idType} = ? OR is_global = 1) AND is_read = 0`,
      [identifier]
    );
    count = rows[0].cnt;
    await redisClient.set(cacheKey, count, { EX: 60 });
    conn.release();
  } else {
    count = parseInt(count);
  }
  res.json({ count });
};

module.exports = { getNotifications, markNotificationsRead, getNotificationCount };
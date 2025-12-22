// src/controllers/notificationController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const redisClient = require('../config/redis');
const { sendGlobalNotification } = require('../utils/sendGlobalNotification');
const { emitGlobal, emitToTarget } = require('../utils/emitNotification');

const getIdentifier = (req) => {
  if (req.session.user_id) {
    return { user_id: req.session.user_id, session_key: null };
  }

  let session_key = req.query.session_key || req.body.session_key;

  if (session_key && !req.session.session_key) {
    req.session.session_key = session_key;
  }

  session_key = req.session.session_key || session_key;

  return { user_id: null, session_key };
};

const getNotifications = async (req, res) => {
  const { identifier, session_key } = getIdentifier(req);
  const idType = identifier ? 'user_id' : 'session_key';

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT notification_id, message, link, type, is_read, created_at 
       FROM notifications 
       WHERE (${idType} = ? OR is_global = 1) 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [identifier || session_key]
    );
    res.json({ status: 'success', data: rows });
  } catch (error) {
    await logError('getNotifications error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch notifications' });
  } finally {
    if (conn) conn.release();
  }
};

const markNotificationsRead = async (req, res) => {
  const { notification_ids = 'all' } = req.body;
  const { identifier, session_key } = getIdentifier(req);
  const idType = identifier ? 'user_id' : 'session_key';

  let conn;
  try {
    conn = await db.getConnection();
    let query = `UPDATE notifications SET is_read = 1 WHERE (${idType} = ? OR is_global = 1)`;
    let params = [identifier || session_key];

    if (notification_ids !== 'all') {
      const placeholders = notification_ids.map(() => '?').join(',');
      query += ` AND notification_id IN (${placeholders})`;
      params = [...notification_ids, ...params];
    }

    const [result] = await conn.query(query, params);
    res.json({ status: 'success', marked: result.affectedRows });
  } catch (error) {
    await logError('markNotificationsRead error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to mark as read' });
  } finally {
    if (conn) conn.release();
  }
};

const getNotificationCount = async (req, res) => {
  const { identifier, session_key } = getIdentifier(req);
  const idType = identifier ? 'user_id' : 'session_key';
  const cacheKey = identifier ? `notification_count_${identifier}` : `notification_count_guest_${session_key}`;

  let count = await redisClient.get(cacheKey);
  if (count === null) {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM notifications WHERE (${idType} = ? OR is_global = 1) AND is_read = 0`,
      [identifier || session_key]
    );
    count = rows[0].cnt;
    await redisClient.set(cacheKey, count, { EX: 60 });
    conn.release();
  } else {
    count = parseInt(count);
  }
  res.json({ count });
};

// New: Send notification (individual or global)
const sendNotification = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const { message, type = 'events', link = null, user_id = null, is_global = false } = req.body;
    if (!message) return res.status(400).json({ status: 'error', message: 'Message required' });

    if (is_global) {
      const { success } = await sendGlobalNotification(message, type, link);
      if (success) {
        res.json({ status: 'success', message: 'Global notification sent' });
      } else {
        res.status(500).json({ status: 'error', message: 'Failed to send global notification' });
      }
    } else {
      if (!user_id) return res.status(400).json({ status: 'error', message: 'User ID required for individual notification' });
      const [result] = await conn.query(
        `INSERT INTO notifications (user_id, message, link, type, created_at) VALUES (?, ?, ?, ?, NOW())`,
        [user_id, message, link, type]
      );
      await emitToTarget(null, user_id, 'user', { notification_id: result.insertId, message, type, link });
      res.json({ status: 'success', notification_id: result.insertId });
    }
  } catch (error) {
    await logError('sendNotification error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to send notification' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getNotifications, markNotificationsRead, getNotificationCount, sendNotification };
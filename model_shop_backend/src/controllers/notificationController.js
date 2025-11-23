// src/controllers/notificationController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const app = require('../app');
const redisClient = require('../config/redis');

const notificationSSE = async (req, res) => {
  if (!req.session.user_id) return res.status(401).end();

  const user_id = req.session.user_id;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  let last_count = -1;

  const sendCount = async () => {
    try {
      const cacheKey = `notification_count_${user_id}`;
      let count = await redisClient.get(cacheKey);

      if (count === null) {
        const conn = await db.getConnection();
        const [rows] = await conn.query('SELECT COUNT(*) AS cnt FROM notifications WHERE user_id = ? AND is_read = 0', [user_id]);
        count = rows[0].cnt;
        conn.release();
        await redisClient.set(cacheKey, count, 'EX', 30);
      } else {
        count = parseInt(count);
      }

      if (last_count !== count) {
        res.write(`event: notification_count\ndata: ${Math.min(count, 99)}\n\n`);
        last_count = count;
      }
    } catch (err) {
      console.error('SSE notification error:', err);
    }
  };

  await sendCount();
  const interval = setInterval(sendCount, 8000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
};

const getNotifications = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const user_id = req.session.user_id;

  let conn;
  try {
    conn = await db.getConnection();
    const [user] = await conn.query('SELECT 1 FROM users WHERE user_id = ? AND is_active = TRUE', [user_id]);
    if (!user.length) return res.status(403).json({ success: false, error: 'User inactive' });

    const { page = 1, perPage = 10, filter = 'All', type = 'all', sort = 'DESC' } = req.query;
    const offset = (page - 1) * perPage;

    let query = 'SELECT notification_id, type, message as content, is_read, created_at FROM notifications WHERE user_id = ?';
    let params = [user_id];

    if (filter === 'unread') {
      query += ' AND is_read = 0';
    } else if (filter === 'read') {
      query += ' AND is_read = 1';
    }

    if (type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ` ORDER BY created_at ${sort === 'ASC' ? 'ASC' : 'DESC'} LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const [notifications] = await conn.query(query, params);

    let totalQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    let totalParams = [user_id];
    if (filter === 'unread') totalQuery += ' AND is_read = 0';
    if (filter === 'read') totalQuery += ' AND is_read = 1';
    if (type !== 'all') {
      totalQuery += ' AND type = ?';
      totalParams.push(type);
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
  if (!req.session.user_id) return res.status(403).json({ success: false, error: 'Unauthorized' });

  const { notification_ids } = req.body;
  if (!Array.isArray(notification_ids) || notification_ids.some(id => !Number.isInteger(id))) {
    return res.status(400).json({ success: false, error: 'Invalid ids' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    const placeholders = notification_ids.map(() => '?').join(',');
    await conn.query(
      `UPDATE notifications SET is_read = 1 WHERE notification_id IN (${placeholders}) AND user_id = ?`,
      [...notification_ids, req.session.user_id]
    );

    // Invalidate cache
    await redisClient.del(`notification_count_${req.session.user_id}`);

    res.json({ success: true, message: 'Marked as read' });
  } catch (err) {
    await logError('markNotificationsRead: ' + err.message);
    res.status(500).json({ success: false, error: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { notificationSSE, getNotifications, markNotificationsRead };
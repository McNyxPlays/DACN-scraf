const db = require('../config/db');
const { logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');

const notificationSSE = async (req, res) => {
  if (!req.session.user_id) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write('event: error\ndata: Unauthorized\n\n');
    return res.end();
  }

  const user_id = req.session.user_id;
  if (!Number.isInteger(user_id) || user_id <= 0) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.write('event: error\ndata: Invalid user_id\n\n');
    return res.end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    const pool = await db.getConnection();
    const [tableCheck] = await pool.query("SHOW TABLES LIKE 'notifications'");
    if (!tableCheck.length) {
      res.write('event: error\ndata: Table "notifications" does not exist\n\n');
      return res.end();
    }

    const cache_file = path.join(process.env.TMPDIR || '/tmp', `notification_count_${user_id}.txt`);
    const cache_duration = 30;
    let last_count = -1;

    const sendNotificationCount = async () => {
      let unread_count = null;
      if (fs.existsSync(cache_file) && (Date.now() - (await fs.stat(cache_file)).mtimeMs) / 1000 < cache_duration) {
        unread_count = parseInt(await fs.readFile(cache_file, 'utf8'));
      } else {
        const [rows] = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', [user_id]);
        unread_count = rows[0]['COUNT(*)'];
        await fs.writeFile(cache_file, unread_count.toString(), { flag: 'w' });
      }

      if (last_count !== unread_count) {
        res.write(`event: notification_count\ndata: ${Math.min(unread_count, 99)}\n\n`);
        last_count = unread_count;
      }
    };

    await sendNotificationCount();
    const interval = setInterval(async () => {
      if (req.aborted) {
        clearInterval(interval);
        res.end();
        return;
      }
      await sendNotificationCount();
    }, last_count === unread_count ? 10000 : 5000);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    res.write(`event: error\ndata: Server error: ${error.message}\n\n`);
    res.end();
  }
};

const getNotifications = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: No active session');
    return res.status(403).json({ success: false, error: 'Unauthorized: No active session' });
  }

  const user_id = req.session.user_id;
  if (!Number.isInteger(user_id) || user_id <= 0) {
    await logError(`Invalid user_id: ${user_id}`);
    return res.status(400).json({ success: false, error: `Invalid user_id: ${user_id}` });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT user_id, is_active FROM users WHERE user_id = ?', [user_id]);
    const user = userRows[0];
    if (!user || !user.is_active) {
      await logError('User not found or inactive');
      return res.status(403).json({ success: false, error: 'User not found or inactive' });
    }

    const [tableCheck] = await pool.query("SHOW TABLES LIKE 'notifications'");
    if (!tableCheck.length) {
      throw new Error('Table "notifications" does not exist');
    }

    const { page = 1, perPage = 10, filter = 'All', category = 'All Categories', sort = 'Newest First' } = req.query;
    const offset = (page - 1) * perPage;
    let query = 'SELECT notification_id, type, content, is_read, created_at FROM notifications WHERE user_id = ?';
    const params = [user_id];

    if (filter === 'Unread') {
      query += ' AND is_read = ?';
      params.push(0);
    } else if (filter === 'Read') {
      query += ' AND is_read = ?';
      params.push(1);
    }

    if (category !== 'All Categories') {
      query += ' AND type = ?';
      params.push(category.toLowerCase());
    }

    query += sort === 'Newest First' ? ' ORDER BY created_at DESC' : ' ORDER BY created_at ASC';
    query += ` LIMIT ${offset}, ${perPage}`;

    const [notifications] = await pool.query(query, params);

    let totalQuery = 'SELECT COUNT(*) FROM notifications WHERE user_id = ?';
    const totalParams = [user_id];
    if (filter === 'Unread') {
      totalQuery += ' AND is_read = ?';
      totalParams.push(0);
    } else if (filter === 'Read') {
      totalQuery += ' AND is_read = ?';
      totalParams.push(1);
    }
    if (category !== 'All Categories') {
      totalQuery += ' AND type = ?';
      totalParams.push(category.toLowerCase());
    }

    const [totalRows] = await pool.query(totalQuery, totalParams);
    const total = totalRows[0]['COUNT(*)'];
    const totalPages = Math.ceil(total / perPage);

    res.json({ success: true, notifications, totalPages });
  } catch (error) {
    await logError('Server error: ' + error.message);
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
};

const markNotificationsRead = async (req, res) => {
  if (!req.session.user_id) {
    await logError('Unauthorized: No active session');
    return res.status(403).json({ success: false, error: 'Unauthorized: No active session' });
  }

  const user_id = req.session.user_id;
  const { notification_ids } = req.body;

  if (!notification_ids || !Array.isArray(notification_ids) || !notification_ids.every(id => Number.isInteger(id) && id > 0)) {
    return res.status(400).json({ success: false, error: 'Invalid notification_ids' });
  }

  try {
    const pool = await db.getConnection();
    const placeholders = notification_ids.map(() => '?').join(',');
    await pool.query(
      `UPDATE notifications SET is_read = 1 WHERE notification_id IN (${placeholders}) AND user_id = ?`,
      [...notification_ids, user_id]
    );
    res.json({ success: true, message: 'Notifications marked as read' });
  } catch (error) {
    await logError('Failed to mark notifications as read: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to mark notifications as read: ' + error.message });
  }
};

module.exports = { notificationSSE, getNotifications, markNotificationsRead };

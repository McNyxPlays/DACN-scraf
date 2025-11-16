// src/models/notificationModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class NotificationModel {
  static async getUnreadCount(user_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0', [user_id]);
      return rows[0]['COUNT(*)'];
    } catch (error) {
      await logError(`Failed to get unread notification count: ${error.message}`);
      throw error;
    }
  }

  static async findAll(user_id, { page = 1, perPage = 10, filter = 'All', category = 'All Categories', sort = 'Newest First' }) {
    try {
      const pool = await db.getConnection();
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
      query += ` LIMIT ${(page - 1) * perPage}, ${perPage}`;

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

      return { notifications, totalPages };
    } catch (error) {
      await logError(`Failed to fetch notifications: ${error.message}`);
      throw error;
    }
  }

  static async markAsRead(notification_ids, user_id) {
    try {
      const pool = await db.getConnection();
      const placeholders = notification_ids.map(() => '?').join(',');
      const [result] = await pool.query(
        `UPDATE notifications SET is_read = 1 WHERE notification_id IN (${placeholders}) AND user_id = ?`,
        [...notification_ids, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to mark notifications as read: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationModel;
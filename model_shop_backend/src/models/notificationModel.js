// src/models/notificationModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class NotificationModel {
  static async getUnreadCount(identifier, idType) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT COUNT(*) as cnt FROM notifications WHERE (${idType} = ? OR is_global = 1) AND is_read = 0`,
        [identifier]
      );
      return rows[0].cnt;
    } catch (error) {
      await logError(`Failed to get unread count: ${error.message}`);
      throw error;
    }
  }

  static async findAll(identifier, idType, { page = 1, perPage = 10, filter = 'All', category = 'All Categories', sort = 'Newest First' }) {
    try {
      const pool = await db.getConnection();
      let query = 'SELECT notification_id, type, message AS content, link, data, is_global, is_read, read_at, created_at FROM notifications WHERE (${idType} = ? OR is_global = 1)';
      const params = [identifier];

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

      let totalQuery = 'SELECT COUNT(*) as total FROM notifications WHERE (${idType} = ? OR is_global = 1)';
      const totalParams = [identifier];
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
      const total = totalRows[0].total;
      const totalPages = Math.ceil(total / perPage);

      return { notifications, totalPages };
    } catch (error) {
      await logError(`Failed to fetch notifications: ${error.message}`);
      throw error;
    }
  }

  static async markAsRead(notification_ids, identifier, idType) {
    try {
      const pool = await db.getConnection();
      let sql = 'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE (${idType} = ? OR is_global = 1)';
      let params = [identifier];

      if (notification_ids !== 'all') {
        const placeholders = notification_ids.map(() => '?').join(',');
        sql += ` AND notification_id IN (${placeholders})`;
        params = [...notification_ids, ...params];
      }

      const [result] = await pool.query(sql, params);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to mark as read: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationModel;
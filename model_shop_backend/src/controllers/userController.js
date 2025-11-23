// src/controllers/userController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const app = require('../app');
const redisClient = require('../config/redis');

const getUserStats = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const user_id = req.session.user_id;
  const cacheKey = `user_stats_${user_id}`;

  let stats = await redisClient.get(cacheKey);
  if (stats) {
    stats = JSON.parse(stats);
    return res.json({ status: 'success', ...stats });
  }

  let conn;
  try {
    conn = await db.getConnection();

    const [followers] = await conn.query('SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [user_id]);
    const [following] = await conn.query('SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [user_id]);
    const [posts] = await conn.query('SELECT COUNT(*) as count FROM posts WHERE user_id = ?', [user_id]);

    stats = {
      followers: followers[0].count,
      following: following[0].count,
      posts: posts[0].count
    };

    await redisClient.set(cacheKey, JSON.stringify(stats), 'EX', 600); // Cache 10 phút
    res.json({ status: 'success', ...stats });
  } catch (error) {
    await logError('getUserStats error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch stats' });
  } finally {
    if (conn) conn.release();
  }
};

const getUsersMana = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [user] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    if (user[0].role !== 'admin') return res.status(403).json({ status: 'error', message: 'Admin only' });

    const [users] = await conn.query('SELECT user_id, email, full_name, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ status: 'success', users });
  } catch (error) {
    await logError('getUsersMana error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch users' });
  } finally {
    if (conn) conn.release();
  }
};

const updateUser = async (req, res) => {
  const user_id = req.session.user_id;
  if (!user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { full_name, email, password, phone_number, address, gender } = req.body;
  const profile_image = req.files?.profile_image?.[0];
  const banner_image = req.files?.banner_image?.[0];

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    let query = 'UPDATE users SET';
    const params = [];

    if (full_name) {
      query += ' full_name = ?,'; 
      params.push(sanitizeInput(full_name));
    }
    if (email) {
      query += ' email = ?,'; 
      params.push(sanitizeInput(email));
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += ' password = ?,'; 
      params.push(hashedPassword);
    }
    if (phone_number) {
      query += ' phone_number = ?,'; 
      params.push(sanitizeInput(phone_number));
    }
    if (address) {
      query += ' address = ?,'; 
      params.push(sanitizeInput(address));
    }
    if (gender) {
      query += ' gender = ?,'; 
      params.push(sanitizeInput(gender));
    }

    if (profile_image) {
      const filename = `${Date.now()}_${profile_image.originalname}`;
      const filepath = path.join(__dirname, '../Uploads/avatars', filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, profile_image.buffer);
      query += ' profile_image = ?,'; 
      params.push(`Uploads/avatars/${filename}`);
    }

    if (banner_image) {
      const filename = `${Date.now()}_${banner_image.originalname}`;
      const filepath = path.join(__dirname, '../Uploads/banners', filename);
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      await fs.writeFile(filepath, banner_image.buffer);
      query += ' banner_image = ?,'; 
      params.push(`Uploads/banners/${filename}`);
    }

    if (params.length === 0) {
      return res.status(400).json({ status: 'error', message: 'No fields to update' });
    }

    query = query.slice(0, -1); // Remove last comma
    query += ' WHERE user_id = ?';
    params.push(user_id);

    const [result] = await conn.query(query, params);
    if (result.affectedRows === 0) throw new Error('No changes');

    await conn.query('COMMIT');
    await redisClient.del(`user_stats_${user_id}`); // Invalidate stats cache
    res.json({ status: 'success', message: 'User updated' });
  } catch (error) {
    await conn.query('ROLLBACK');
    await logError('updateUser error: ' + error.message);
    res.status(500).json({ status: 'error', message: error.message });
  } finally {
    if (conn) conn.release();
  }
};

const deleteUser = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const user_id = req.session.user_id;

  let conn;
  try {
    conn = await db.getConnection();
    const [result] = await conn.query('UPDATE users SET is_active = FALSE WHERE user_id = ?', [user_id]);
    if (result.affectedRows > 0) {
      req.session.destroy();
      await redisClient.del(`user_stats_${user_id}`);
      res.json({ status: 'success', message: 'Deactivated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Not found' });
    }
  } catch (error) {
    await logError('deleteUser error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to deactivate' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getUserStats, getUsersMana, updateUser, deleteUser };
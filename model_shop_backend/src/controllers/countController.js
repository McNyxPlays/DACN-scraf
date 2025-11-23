// src/controllers/countController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const app = require('../app');
const redisClient = require('../config/redis');

const getCounts = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [user] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const cacheKey = 'admin_counts';
    let counts = await redisClient.get(cacheKey);

    if (counts) {
      counts = JSON.parse(counts);
    } else {
      const [users] = await conn.query('SELECT COUNT(*) as count FROM users');
      const [products] = await conn.query('SELECT COUNT(*) as count FROM products WHERE is_available = TRUE');
      const [categories] = await conn.query('SELECT COUNT(*) as count FROM categories');
      const [brands] = await conn.query('SELECT COUNT(*) as count FROM brands');

      counts = {
        users: users[0].count,
        products: products[0].count,
        categories: categories[0].count,
        brands: brands[0].count
      };
      await redisClient.set(cacheKey, JSON.stringify(counts), 'EX', 3600); 
    }

    res.json({ status: 'success', data: counts });
  } catch (error) {
    await logError('getCounts error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch counts' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getCounts };
// src/controllers/countController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const redisClient = require('../config/redis');

const getCounts = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn = null;
  try {
    conn = await db.getConnection();
    const [user] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    if (!user[0] || user[0].role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const cacheKey = 'admin_counts';
    let counts = await redisClient.get(cacheKey);

    if (counts) {
      counts = JSON.parse(counts);
    } else {
      const [customers] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "user"');
      const [sellers] = await conn.query('SELECT COUNT(*) as count FROM users WHERE role = "customizer"');
      const [products] = await conn.query('SELECT COUNT(*) as count FROM products WHERE is_available = TRUE');
      const [categories] = await conn.query('SELECT COUNT(*) as count FROM categories');
      const [brands] = await conn.query('SELECT COUNT(*) as count FROM brands');
      const [promotions] = await conn.query('SELECT COUNT(*) as count FROM promotions WHERE status = "active"');
      const [orders] = await conn.query('SELECT COUNT(*) as count FROM orders');
      const [notifications] = await conn.query('SELECT COUNT(*) as count FROM messages');
      const [nfts] = await conn.query('SELECT COUNT(*) as count FROM (SELECT token_id FROM user_nft_mints UNION SELECT token_id FROM order_nft_mints) AS combined_nfts');
      const [transactions] = await conn.query('SELECT COUNT(*) as count FROM order_nft_mints');
      const [sales] = await conn.query('SELECT SUM(total_amount) as total FROM orders WHERE status = "delivered"');

      counts = {
        customers: customers[0].count,
        sellers: sellers[0].count, 
        products: products[0].count,
        categories: categories[0].count,
        brands: brands[0].count,
        promotions: promotions[0].count,
        orders: orders[0].count,
        notifications: notifications[0].count,
        nfts: nfts[0].count,
        transactions: transactions[0].count,
        sales: sales[0].total || 0
      };
      await redisClient.set(cacheKey, JSON.stringify(counts), 'EX', 3600); 
    }

    res.json({ status: 'success', data: counts });
  } catch (error) {
    console.error('Error in getCounts:', error.stack); 
    await logError('getCounts error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch counts' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { getCounts };
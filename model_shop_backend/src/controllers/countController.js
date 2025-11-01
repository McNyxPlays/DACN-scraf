const db = require('../config/db');
const { logError } = require('../config/functions');

const getCounts = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ status: 'error', message: 'Unauthorized' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ status: 'error', message: 'Unauthorized - Not an admin' });
    }

    const [usersCount] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [productsCount] = await pool.query('SELECT COUNT(*) as count FROM products');
    const [categoriesCount] = await pool.query('SELECT COUNT(*) as count FROM categories');
    const [brandsCount] = await pool.query('SELECT COUNT(*) as count FROM brands');

    res.json({
      status: 'success',
      data: {
        users: usersCount[0].count,
        products: productsCount[0].count,
        categories: categoriesCount[0].count,
        brands: brandsCount[0].count
      }
    });
  } catch (error) {
    await logError('Failed to fetch counts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch counts: ' + error.message });
  }
};

module.exports = { getCounts };

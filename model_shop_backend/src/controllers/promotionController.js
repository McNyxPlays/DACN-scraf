const db = require('../config/db');
const { logError } = require('../config/functions');

const applyPromotion = async (req, res) => {
  if (!req.session.csrf_token || req.headers['x-csrf-token'] !== req.session.csrf_token) {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }

  const { code, total_amount = 0, user_id, guest_email } = req.body;

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'Promo code is required' });
  }

  try {
    const pool = await db.getConnection();
    const [promotionRows] = await pool.query(
      `SELECT promotion_id, discount_percentage, end_date
       FROM promotions
       WHERE code = ? AND status = 'active' AND is_active = TRUE
       AND (max_usage IS NULL OR usage_count < max_usage)
       AND (end_date IS NULL OR end_date > NOW())`,
      [code]
    );
    const promotion = promotionRows[0];

    if (promotion) {
      const discountAmount = total_amount * (promotion.discount_percentage / 100);
      await pool.query('UPDATE promotions SET usage_count = usage_count + 1 WHERE promotion_id = ?', [promotion.promotion_id]);
      res.status(200).json({ status: 'success', discount: discountAmount, promotion_id: promotion.promotion_id });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid promo code' });
    }
  } catch (error) {
    await logError('Server error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error: ' + error.message });
  }
};

const getPromotionsMana = async (req, res) => {
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

    if (req.query.id) {
      const id = parseInt(req.query.id);
      const [promotionRows] = await pool.query(
        'SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count, is_active FROM promotions WHERE promotion_id = ?',
        [id]
      );
      const promotion = promotionRows[0];
      if (promotion) {
        res.json({ status: 'success', data: [promotion] });
      } else {
        res.status(404).json({ status: 'error', message: 'Promotion not found' });
      }
    } else {
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const [promotions] = await pool.query(
        'SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count, is_active FROM promotions WHERE name LIKE ? OR code LIKE ?',
        [search, search]
      );
      res.json({ status: 'success', data: promotions });
    }
  } catch (error) {
    await logError('Failed to fetch promotions: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch promotions: ' + error.message });
  }
};

const addPromotion = async (req, res) => {
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

    const { name, code, discount_percentage, start_date, end_date, max_usage, status, is_active = true } = req.body;

    if (!name || !code || !discount_percentage || !start_date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    if (discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ status: 'error', message: 'Discount percentage must be between 0 and 100' });
    }

    const [existingCode] = await pool.query('SELECT promotion_id FROM promotions WHERE code = ?', [code]);
    if (existingCode.length) {
      return res.status(400).json({ status: 'error', message: 'Promotion code already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO promotions (name, code, discount_percentage, start_date, end_date, max_usage, status, usage_count, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [name, code, discount_percentage, start_date, end_date || null, max_usage || null, status, is_active]
    );

    res.json({ status: 'success', message: 'Promotion added', promotion_id: result.insertId });
  } catch (error) {
    await logError('Failed to add promotion: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to add promotion: ' + error.message });
  }
};

const updatePromotion = async (req, res) => {
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

    const id = parseInt(req.query.id);
    const { name, code, discount_percentage, start_date, end_date, status, usage_count, is_active } = req.body;

    if (!id || !name || !code || !discount_percentage || !start_date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Invalid status' });
    }

    if (discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ status: 'error', message: 'Discount percentage must be between 0 and 100' });
    }

    const [existingCode] = await pool.query('SELECT promotion_id FROM promotions WHERE code = ? AND promotion_id != ?', [code, id]);
    if (existingCode.length) {
      return res.status(400).json({ status: 'error', message: 'Promotion code already exists' });
    }

    const [result] = await pool.query(
      `UPDATE promotions
       SET name = ?, code = ?, discount_percentage = ?, start_date = ?, end_date = ?, status = ?, usage_count = ?, is_active = ?
       WHERE promotion_id = ?`,
      [name, code, discount_percentage, start_date, end_date || null, status, usage_count || 0, is_active, id]
    );

    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Promotion updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Promotion not found' });
    }
  } catch (error) {
    await logError('Failed to update promotion: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update promotion: ' + error.message });
  }
};

const deletePromotion = async (req, res) => {
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

    const id = parseInt(req.query.id);
    if (id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid promotion ID' });
    }

    const [result] = await pool.query('DELETE FROM promotions WHERE promotion_id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Promotion deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Promotion not found' });
    }
  } catch (error) {
    await logError('Failed to delete promotion: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete promotion: ' + error.message });
  }
};

module.exports = { applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion };
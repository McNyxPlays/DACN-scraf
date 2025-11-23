// src/controllers/promotionController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const app = require('../app');
const redisClient = require('../config/redis');

const applyPromotion = async (req, res) => {
  if (!req.session.csrf_token || req.headers['x-csrf-token'] !== req.session.csrf_token) {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }

  const { code, total_amount = 0 } = req.body;

  if (!code) {
    return res.status(400).json({ status: 'error', message: 'Promo code is required' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    const [promotionRows] = await conn.query(
      `SELECT promotion_id, discount_percentage, end_date, max_usage, usage_count
       FROM promotions
       WHERE code = ? AND status = 'active'
       AND (max_usage IS NULL OR usage_count < max_usage)
       AND (end_date IS NULL OR end_date > NOW())`,
      [code]
    );
    const promotion = promotionRows[0];

    if (promotion) {
      const discountAmount = total_amount * (promotion.discount_percentage / 100);
      await conn.query('UPDATE promotions SET usage_count = usage_count + 1 WHERE promotion_id = ?', [promotion.promotion_id]);
      res.status(200).json({ status: 'success', discount: discountAmount, promotion_id: promotion.promotion_id });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid or expired promo code' });
    }
  } catch (error) {
    await logError('applyPromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const getPromotionsMana = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const cacheKey = 'admin_promotions_list';
    let promotions = await redisClient.get(cacheKey);

    if (promotions) {
      promotions = JSON.parse(promotions);
    } else {
      const [rows] = await conn.query(
        'SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count, max_usage FROM promotions ORDER BY created_at DESC'
      );
      promotions = rows;
      await redisClient.set(cacheKey, JSON.stringify(promotions), 'EX', 1800); // 30 min
    }

    res.json({ status: 'success', data: promotions });
  } catch (error) {
    await logError('getPromotionsMana error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch' });
  } finally {
    if (conn) conn.release();
  }
};

const addPromotion = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const { name, code, discount_percentage, start_date, end_date, status = 'active', max_usage } = req.body;

    if (!name || !code || discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ status: 'error', message: 'Invalid input' });
    }

    const [existing] = await conn.query('SELECT promotion_id FROM promotions WHERE code = ?', [code]);
    if (existing.length) return res.status(400).json({ status: 'error', message: 'Code exists' });

    await conn.query(
      'INSERT INTO promotions (name, code, discount_percentage, start_date, end_date, status, max_usage) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, code, discount_percentage, start_date, end_date || null, status, max_usage || null]
    );

    await redisClient.del('admin_promotions_list');
    res.json({ status: 'success', message: 'Promotion added' });
  } catch (error) {
    await logError('addPromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to add' });
  } finally {
    if (conn) conn.release();
  }
};

const updatePromotion = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const id = parseInt(req.query.id);
    const { name, code, discount_percentage, start_date, end_date, status, usage_count, max_usage } = req.body;

    if (!id || !name || !code || discount_percentage < 0 || discount_percentage > 100) {
      return res.status(400).json({ status: 'error', message: 'Invalid input' });
    }

    const [result] = await conn.query(
      `UPDATE promotions SET name = ?, code = ?, discount_percentage = ?, start_date = ?, end_date = ?, status = ?, usage_count = ?, max_usage = ?
       WHERE promotion_id = ?`,
      [name, code, discount_percentage, start_date, end_date || null, status, usage_count || 0, max_usage || null, id]
    );

    if (result.affectedRows > 0) {
      await redisClient.del('admin_promotions_list');
      res.json({ status: 'success', message: 'Promotion updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Promotion not found' });
    }
  } catch (error) {
    await logError('updatePromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update' });
  } finally {
    if (conn) conn.release();
  }
};

const deletePromotion = async (req, res) => {
  if (!req.session.user_id) return res.status(403).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid ID' });

    const [result] = await conn.query('DELETE FROM promotions WHERE promotion_id = ?', [id]);
    if (result.affectedRows > 0) {
      await redisClient.del('admin_promotions_list');
      res.json({ status: 'success', message: 'Deleted' });
    } else {
      res.status(404).json({ status: 'error', message: 'Not found' });
    }
  } catch (error) {
    await logError('deletePromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to delete' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { applyPromotion, getPromotionsMana, addPromotion, updatePromotion, deletePromotion };
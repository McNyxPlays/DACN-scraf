// src/controllers/promotionController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
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
      res.json({ status: 'success', discount: discountAmount });
    } else {
      res.status(404).json({ status: 'error', message: 'Invalid or expired promo code' });
    }
  } catch (error) {
    await logError('applyPromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to apply promotion' });
  } finally {
    if (conn) conn.release();
  }
};

const getPromotionsMana = async (req, res) => {
  let conn;
  try {
    conn = await db.getConnection();

    const { search = '', status = '' } = req.query;
    let query = `
      SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count
      FROM promotions
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ' AND (name LIKE ? OR code LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    query += ' ORDER BY created_at DESC';

    const [rows] = await conn.query(query, params);
    res.json({ status: 'success', data: rows });
  } catch (error) {
    await logError('getPromotionsMana error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch promotions: ' + error.message });
  } finally {
    if (conn) conn.release();
  }
};

const addPromotion = async (req, res) => {
  // Xóa kiểm tra user_id và role admin
  let conn;
  try {
    conn = await db.getConnection();

    const { name, code, discount_percentage, start_date, end_date, status = 'active', usage_count = 0, max_usage = null } = req.body;
    if (!name || !code || !discount_percentage || !start_date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const [result] = await conn.query(
      `INSERT INTO promotions 
       (name, code, discount_percentage, start_date, end_date, status, usage_count, max_usage)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, code, discount_percentage, start_date, end_date || null, status, usage_count, max_usage]
    );

    await redisClient.del('admin_promotions_list');
    res.json({ status: 'success', promotion_id: result.insertId });
  } catch (error) {
    await logError('addPromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to add promotion' });
  } finally {
    if (conn) conn.release();
  }
};

const updatePromotion = async (req, res) => {
  // Xóa kiểm tra user_id và role admin
  let conn;
  try {
    conn = await db.getConnection();

    const id = parseInt(req.query.id);
    if (!id) return res.status(400).json({ status: 'error', message: 'Invalid ID' });

    const { name, code, discount_percentage, start_date, end_date, status, usage_count, max_usage } = req.body;
    if (!name || !code || !discount_percentage || !start_date) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const [result] = await conn.query(
      `UPDATE promotions
       SET name = ?, code = ?, discount_percentage = ?, start_date = ?, end_date = ?, status = ?, usage_count = ?, max_usage = ?
       WHERE promotion_id = ?`,
      [name, code, discount_percentage, start_date, end_date || null, status, usage_count || 0, max_usage || null, id]
    );

    if (result.affectedRows > 0) {
      await redisClient.del('admin_promotions_list');
      res.json({ status: 'success', message: 'Updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Not found' });
    }
  } catch (error) {
    await logError('updatePromotion error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update' });
  } finally {
    if (conn) conn.release();
  }
};

const deletePromotion = async (req, res) => {
  // Xóa kiểm tra user_id và role admin
  let conn;
  try {
    conn = await db.getConnection();

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
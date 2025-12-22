// src/models/promotionModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class PromotionModel {
  static async findByCode(code) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT promotion_id, discount_percentage, end_date
         FROM promotions
         WHERE code = ? AND status = 'active' AND is_active = TRUE
         AND (max_usage IS NULL OR usage_count < max_usage)
         AND (end_date IS NULL OR end_date > NOW())`,
        [code]
      );
      return rows[0];
    } catch (error) {
      await logError(`Failed to find promotion by code: ${error.message}`);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        'SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count, is_active FROM promotions WHERE promotion_id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      await logError(`Failed to find promotion by ID: ${error.message}`);
      throw error;
    }
  }

  static async findAll({ search = '', status = '' }) {
    try {
      const pool = await db.getConnection();
      let query = 'SELECT promotion_id, name, code, discount_percentage, start_date, end_date, status, usage_count, is_active FROM promotions WHERE 1=1';
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
      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      await logError(`Failed to fetch promotions: ${error.message}`);
      throw error;
    }
  }

  static async create({ name, code, discount_percentage, start_date, end_date = null, status = 'active', usage_count = 0, is_active = true }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'INSERT INTO promotions (name, code, discount_percentage, start_date, end_date, status, usage_count, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [name, code, discount_percentage, start_date, end_date, status, usage_count, is_active]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create promotion: ${error.message}`);
      throw error;
    }
  }

  static async update(id, { name, code, discount_percentage, start_date, end_date, status, usage_count, is_active }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        `UPDATE promotions SET name = ?, code = ?, discount_percentage = ?, start_date = ?, end_date = ?, status = ?, usage_count = ?, is_active = ?
         WHERE promotion_id = ?`,
        [name, code, discount_percentage, start_date, end_date || null, status, usage_count || 0, is_active, id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update promotion: ${error.message}`);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM promotions WHERE promotion_id = ?', [id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete promotion: ${error.message}`);
      throw error;
    }
  }

  static async incrementUsage(promotion_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('UPDATE promotions SET usage_count = usage_count + 1 WHERE promotion_id = ?', [promotion_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to increment promotion usage: ${error.message}`);
      throw error;
    }
  }
}

module.exports = PromotionModel;
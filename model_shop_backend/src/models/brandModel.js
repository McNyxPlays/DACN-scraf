// src/models/brandModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class BrandModel {
  static async findById(id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT brand_id, name, description FROM brands WHERE brand_id = ?', [id]);
      return rows[0];
    } catch (error) {
      await logError(`Failed to find brand by ID: ${error.message}`);
      throw error;
    }
  }

  static async findAll(search = '%') {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT brand_id, name, description FROM brands WHERE name LIKE ?', [search]);
      return rows;
    } catch (error) {
      await logError(`Failed to fetch brands: ${error.message}`);
      throw error;
    }
  }

  static async create({ name, description }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('INSERT INTO brands (name, description) VALUES (?, ?)', [name, description || '']);
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create brand: ${error.message}`);
      throw error;
    }
  }

  static async update(id, { name, description }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('UPDATE brands SET name = ?, description = ? WHERE brand_id = ?', [name, description || '', id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update brand: ${error.message}`);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM brands WHERE brand_id = ?', [id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete brand: ${error.message}`);
      throw error;
    }
  }
}

module.exports = BrandModel;
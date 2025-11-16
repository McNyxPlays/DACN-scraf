// src/models/categoryModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class CategoryModel {
  static async findById(id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT category_id, name, description FROM categories WHERE category_id = ?', [id]);
      return rows[0];
    } catch (error) {
      await logError(`Failed to find category by ID: ${error.message}`);
      throw error;
    }
  }

  static async findAll(search = '%') {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT category_id, name, description FROM categories WHERE name LIKE ?', [search]);
      return rows;
    } catch (error) {
      await logError(`Failed to fetch categories: ${error.message}`);
      throw error;
    }
  }

  static async create({ name, description }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('INSERT INTO categories (name, description) VALUES (?, ?)', [name, description || '']);
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create category: ${error.message}`);
      throw error;
    }
  }

  static async update(id, { name, description }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('UPDATE categories SET name = ?, description = ? WHERE category_id = ?', [name, description || '', id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update category: ${error.message}`);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM categories WHERE category_id = ?', [id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete category: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CategoryModel;
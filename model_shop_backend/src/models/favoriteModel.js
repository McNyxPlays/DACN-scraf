// src/models/favoriteModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class FavoriteModel {
  static async findAll(user_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT usi.saved_id, p.product_id, p.name, p.price, pi.image_url
         FROM user_saved_items usi
         JOIN products p ON usi.product_id = p.product_id
         LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
         WHERE usi.user_id = ? AND usi.save_type = 'favorite' AND usi.product_id IS NOT NULL`,
        [user_id]
      );
      return rows;
    } catch (error) {
      await logError(`Failed to fetch favorites: ${error.message}`);
      throw error;
    }
  }

  static async create(user_id, product_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'INSERT INTO user_saved_items (user_id, product_id, save_type) VALUES (?, ?, "favorite")',
        [user_id, product_id]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create favorite: ${error.message}`);
      throw error;
    }
  }

  static async delete(saved_id, user_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM user_saved_items WHERE saved_id = ? AND user_id = ? AND save_type = "favorite"',
        [saved_id, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete favorite: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FavoriteModel;
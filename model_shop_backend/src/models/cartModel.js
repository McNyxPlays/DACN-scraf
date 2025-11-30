// src/models/cartModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class CartModel {
  static async addToCart(user_id, session_key, product_id, quantity) {  // THÊM session_key
    try {
      const pool = await db.getConnection();
      const [existingRows] = await pool.query(
        'SELECT quantity FROM carts WHERE product_id = ? AND (user_id = ? OR session_key = ?)',
        [product_id, user_id || null, session_key || null]
      );
      const existing = existingRows[0];

      if (existing) {
        const [result] = await pool.query(
          'UPDATE carts SET quantity = ? WHERE product_id = ? AND (user_id = ? OR session_key = ?)',
          [existing.quantity + quantity, product_id, user_id || null, session_key || null]
        );
        return result.affectedRows;
      } else {
        const [result] = await pool.query(
          'INSERT INTO carts (user_id, session_key, product_id, quantity) VALUES (?, ?, ?, ?)',
          [user_id, session_key, product_id, quantity]
        );
        return result.insertId;
      }
    } catch (error) {
      await logError(`Failed to add to cart: ${error.message}`);
      throw error;
    }
  }

  // Xóa addToGuestCart vì dùng chung carts

  static async getCart(user_id, session_key) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT c.cart_id, c.quantity, p.product_id, p.name, p.price, p.discount, p.stock_quantity, pi.image_url, cat.name as category_name, b.name as brand_name
         FROM carts c JOIN products p ON c.product_id = p.product_id 
         LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = TRUE 
         LEFT JOIN categories cat ON p.category_id = cat.category_id 
         LEFT JOIN brands b ON p.brand_id = b.brand_id 
         WHERE c.user_id = ? OR c.session_key = ?`,
        [user_id || null, session_key || null]
      );
      return rows;
    } catch (error) {
      await logError(`Failed to get cart: ${error.message}`);
      throw error;
    }
  }

  static async getCartCount(user_id, session_key) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS count FROM carts WHERE user_id = ? OR session_key = ?',
        [user_id || null, session_key || null]
      );
      return rows[0].count;
    } catch (error) {
      await logError(`Failed to get cart count: ${error.message}`);
      throw error;
    }
  }

  static async updateCart(cart_id, user_id, session_key, quantity) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'UPDATE carts SET quantity = ? WHERE cart_id = ? AND (user_id = ? OR session_key = ?)',
        [quantity, cart_id, user_id || null, session_key || null]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update cart: ${error.message}`);
      throw error;
    }
  }

  static async deleteCart(cart_id, user_id, session_key) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM carts WHERE cart_id = ? AND (user_id = ? OR session_key = ?)',
        [cart_id, user_id || null, session_key || null]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete cart item: ${error.message}`);
      throw error;
    }
  }

  static async clearCart(user_id, session_key) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM carts WHERE user_id = ? OR session_key = ?',
        [user_id || null, session_key || null]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to clear cart: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CartModel;
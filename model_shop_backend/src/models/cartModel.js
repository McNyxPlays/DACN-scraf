const db = require('../config/db');
const { logError } = require('../config/functions');

class CartModel {
  static async addToCart(user_id, product_id, quantity) {
    try {
      const pool = await db.getConnection();
      const [existingRows] = await pool.query(
        'SELECT quantity FROM carts WHERE user_id = ? AND product_id = ?',
        [user_id, product_id]
      );
      const existing = existingRows[0];

      if (existing) {
        const [result] = await pool.query(
          'UPDATE carts SET quantity = ? WHERE user_id = ? AND product_id = ?',
          [existing.quantity + quantity, user_id, product_id]
        );
        return result.affectedRows;
      } else {
        const [result] = await pool.query(
          'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
          [user_id, product_id, quantity]
        );
        return result.insertId;
      }
    } catch (error) {
      await logError(`Failed to add to cart: ${error.message}`);
      throw error;
    }
  }

  static async addToGuestCart(session_key, product_id, quantity) {
    try {
      const pool = await db.getConnection();
      const [existingRows] = await pool.query(
        'SELECT quantity FROM guest_carts WHERE session_key = ? AND product_id = ?',
        [session_key, product_id]
      );
      const existing = existingRows[0];

      if (existing) {
        const [result] = await pool.query(
          'UPDATE guest_carts SET quantity = ? WHERE session_key = ? AND product_id = ?',
          [existing.quantity + quantity, session_key, product_id]
        );
        return result.affectedRows;
      } else {
        const [result] = await pool.query(
          'INSERT INTO guest_carts (session_key, product_id, quantity) VALUES (?, ?, ?)',
          [session_key, product_id, quantity]
        );
        return result.insertId;
      }
    } catch (error) {
      await logError(`Failed to add to guest cart: ${error.message}`);
      throw error;
    }
  }

  static async getCart(user_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT c.cart_id, c.quantity, p.product_id, p.name, p.price, p.discount, p.stock_quantity,
                pi.image_url, cat.name as category_name, b.name as brand_name
         FROM carts c
         JOIN products p ON c.product_id = p.product_id
         LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = TRUE
         LEFT JOIN categories cat ON p.category_id = cat.category_id
         LEFT JOIN brands b ON p.brand_id = b.brand_id
         WHERE c.user_id = ?`,
        [user_id]
      );
      return rows;
    } catch (error) {
      await logError(`Failed to get cart: ${error.message}`);
      throw error;
    }
  }

  static async getGuestCart(session_key) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT gc.guest_cart_id, gc.quantity, p.product_id, p.name, p.price, p.discount, p.stock_quantity,
                pi.image_url, c.name as category_name, b.name as brand_name
         FROM guest_carts gc
         JOIN products p ON gc.product_id = p.product_id
         LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = TRUE
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN brands b ON p.brand_id = b.brand_id
         WHERE gc.session_key = ?`,
        [session_key]
      );
      return rows;
    } catch (error) {
      await logError(`Failed to get guest cart: ${error.message}`);
      throw error;
    }
  }

  static async updateCart(cart_id, user_id, quantity) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'UPDATE carts SET quantity = ? WHERE cart_id = ? AND user_id = ?',
        [quantity, cart_id, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update cart: ${error.message}`);
      throw error;
    }
  }

  static async updateGuestCart(guest_cart_id, session_key, quantity) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'UPDATE guest_carts SET quantity = ? WHERE guest_cart_id = ? AND session_key = ?',
        [quantity, guest_cart_id, session_key]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update guest cart: ${error.message}`);
      throw error;
    }
  }

  static async deleteCart(cart_id, user_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM carts WHERE cart_id = ? AND user_id = ?',
        [cart_id, user_id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete cart item: ${error.message}`);
      throw error;
    }
  }

  static async clearCart(user_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM carts WHERE user_id = ?', [user_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to clear cart: ${error.message}`);
      throw error;
    }
  }

  static async deleteGuestCart(guest_cart_id, session_key) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        'DELETE FROM guest_carts WHERE guest_cart_id = ? AND session_key = ?',
        [guest_cart_id, session_key]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete guest cart item: ${error.message}`);
      throw error;
    }
  }

  static async clearGuestCart(session_key) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM guest_carts WHERE session_key = ?', [session_key]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to clear guest cart: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CartModel;
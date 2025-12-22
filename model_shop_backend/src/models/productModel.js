// src/models/productModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class ProductModel {
  static async findById(id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT 
          product_id, name, category_id, brand_id, price, discount, stock_quantity, 
          description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id, 
          created_at, updated_at
         FROM products 
         WHERE product_id = ?`,
        [id]
      );
      return rows[0];
    } catch (error) {
      await logError(`Failed to find product by ID: ${error.message}`);
      throw error;
    }
  }

  static async findAll({ search = '', category_id = null, brand_id = null, status = '', limit = 20, offset = 0 }) {
    try {
      const pool = await db.getConnection();
      let query = `
        SELECT 
          product_id, name, category_id, brand_id, price, discount, stock_quantity, 
          description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id, 
          created_at, updated_at
        FROM products 
        WHERE 1=1
      `;
      const params = [];

      if (search.trim()) {
        query += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      if (category_id) {
        query += ' AND category_id = ?';
        params.push(category_id);
      }

      if (brand_id) {
        query += ' AND brand_id = ?';
        params.push(brand_id);
      }

      if (status) {
        const flags = ProductModel.mapStatusToFlags(status); // Use static method
        if (flags.is_new) query += ' AND is_new = TRUE';
        if (flags.is_used) query += ' AND is_used = TRUE';
        if (flags.is_custom) query += ' AND is_custom = TRUE';
        if (flags.is_hot) query += ' AND is_hot = TRUE';
        if (!flags.is_available) query += ' AND is_available = FALSE';
        if (flags.is_on_sale) query += ' AND is_on_sale = TRUE';
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const [rows] = await pool.query(query, params);
      return rows;
    } catch (error) {
      await logError(`Failed to find all products: ${error.message}`);
      throw error;
    }
  }

  static async create({ name, category_id, brand_id, price, discount, stock_quantity, description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        `INSERT INTO products (name, category_id, brand_id, price, discount, stock_quantity, description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category_id, brand_id, price, discount, stock_quantity, description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create product: ${error.message}`);
      throw error;
    }
  }

  static async update(id, { name, category_id, brand_id, price, discount, stock_quantity, description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        `UPDATE products SET 
          name = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, stock_quantity = ?, 
          description = ?, is_new = ?, is_used = ?, is_custom = ?, is_hot = ?, is_available = ?, 
          is_on_sale = ?, nft_id = ?
         WHERE product_id = ?`,
        [name, category_id, brand_id, price, discount, stock_quantity, description, is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id, id]
      );
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to update product: ${error.message}`);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete product: ${error.message}`);
      throw error;
    }
  }

  static async associateNft(product_id, nft_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('UPDATE products SET nft_id = ? WHERE product_id = ?', [nft_id, product_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to associate NFT with product: ${error.message}`);
      throw error;
    }
  }

  static mapStatusToFlags(status) {
    const flags = {
      is_new: false,
      is_used: false,
      is_custom: false,
      is_hot: false,
      is_available: true,
      is_on_sale: false,
    };
    if (!status) return flags;
    switch (status.toLowerCase()) {
      case 'new': flags.is_new = true; break;
      case 'used': flags.is_used = true; break;
      case 'custom': flags.is_custom = true; break;
      case 'hot': flags.is_hot = true; break;
      case 'unavailable': flags.is_available = false; break;
      case 'sale':
      case 'on_sale': flags.is_on_sale = true; break;
    }
    return flags;
  }
}

module.exports = ProductModel;
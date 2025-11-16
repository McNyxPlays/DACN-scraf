// src/models/productModel.js
const db = require('../config/db');
const { logError } = require('../config/functions');

class ProductModel {
  static async findById(id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query(
        `SELECT p.product_id, p.name, p.description, p.price, p.status, p.stock_quantity, p.discount,
                c.name as category_name, b.name as brand_name, p.created_at
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN brands b ON p.brand_id = b.brand_id
         WHERE p.product_id = ?`,
        [id]
      );
      const product = rows[0];
      if (product) {
        const [images] = await pool.query(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_main DESC, image_id ASC',
          [id]
        );
        product.images = images.length ? images.map(img => `/Uploads/products/${img.image_url}`) : ['/placeholder.jpg'];
      }
      return product;
    } catch (error) {
      await logError(`Failed to find product by ID: ${error.message}`);
      throw error;
    }
  }

  static async findAll({ search = '%', category_ids = [], brand_ids = [], page = 1, limit = 12, sort = 'popularity', price_min = 0, price_max = Number.MAX_SAFE_INTEGER, status_new = false, status_hot = false, status_sale = false, discount_min = 0, discount_max = 100 }) {
    try {
      const pool = await db.getConnection();
      let query = `
        SELECT p.product_id, p.name, p.description, p.price, p.status, p.stock_quantity, p.discount,
               c.name as category_name, b.name as brand_name, p.created_at
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE p.name LIKE ?
      `;
      const params = [`%${search}%`];

      if (category_ids.length && category_ids[0] !== '') {
        const placeholders = category_ids.map(() => '?').join(',');
        query += ` AND p.category_id IN (${placeholders})`;
        params.push(...category_ids.map(Number));
      }

      if (brand_ids.length && brand_ids[0] !== '') {
        const placeholders = brand_ids.map(() => '?').join(',');
        query += ` AND p.brand_id IN (${placeholders})`;
        params.push(...brand_ids.map(Number));
      }

      if (price_min > 0 || price_max < Number.MAX_SAFE_INTEGER) {
        query += ' AND p.price BETWEEN ? AND ?';
        params.push(price_min, price_max);
      }

      const statusConditions = [];
      if (status_new) statusConditions.push("p.status = 'new'");
      if (status_hot) statusConditions.push("p.status = 'hot'");
      if (status_sale) statusConditions.push("p.status = 'sale'");
      if (statusConditions.length) {
        query += ` AND (${statusConditions.join(' OR ')})`;
      }

      if (discount_min > 0 || discount_max < 100) {
        query += ' AND p.discount BETWEEN ? AND ?';
        params.push(discount_min, discount_max);
      }

      switch (sort) {
        case 'price_low':
          query += ' ORDER BY p.price ASC';
          break;
        case 'price_high':
          query += ' ORDER BY p.price DESC';
          break;
        case 'newest':
          query += ' ORDER BY p.created_at DESC';
          break;
        case 'discount_high':
          query += ' ORDER BY p.discount DESC';
          break;
        case 'popularity':
        default:
          query += ' ORDER BY (SELECT COUNT(*) FROM order_details od WHERE od.product_id = p.product_id) DESC';
          break;
      }

      let countQuery = 'SELECT COUNT(*) as total FROM products p WHERE p.name LIKE ?';
      const countParams = [`%${search}%`];
      if (category_ids.length && category_ids[0] !== '') {
        const placeholders = category_ids.map(() => '?').join(',');
        countQuery += ` AND p.category_id IN (${placeholders})`;
        countParams.push(...category_ids.map(Number));
      }
      if (brand_ids.length && brand_ids[0] !== '') {
        const placeholders = brand_ids.map(() => '?').join(',');
        countQuery += ` AND p.brand_id IN (${placeholders})`;
        countParams.push(...brand_ids.map(Number));
      }
      if (statusConditions.length) {
        countQuery += ` AND (${statusConditions.join(' OR ')})`;
      }
      if (discount_min > 0 || discount_max < 100) {
        countQuery += ' AND p.discount BETWEEN ? AND ?';
        countParams.push(discount_min, discount_max);
      }

      const [countRows] = await pool.query(countQuery, countParams);
      const total = countRows[0].total;
      const totalPages = Math.ceil(total / limit);

      query += ` LIMIT ${limit} OFFSET ${(page - 1) * limit}`;
      const [products] = await pool.query(query, params);

      for (let product of products) {
        const [images] = await pool.query(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_main DESC, image_id ASC',
          [product.product_id]
        );
        product.images = images.length ? images.map(img => `/Uploads/products/${img.image_url}`) : ['/placeholder.jpg'];
      }

      return { products, total, totalPages };
    } catch (error) {
      await logError(`Failed to fetch products: ${error.message}`);
      throw error;
    }
  }

  static async create({ name, category_id, brand_id, price, discount = 0, stock_quantity = 0, description, status = 'new' }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        `INSERT INTO products (name, category_id, brand_id, price, discount, stock_quantity, description, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, category_id, brand_id, price, discount, stock_quantity, description, status]
      );
      return result.insertId;
    } catch (error) {
      await logError(`Failed to create product: ${error.message}`);
      throw error;
    }
  }

  static async update(id, { name, category_id, brand_id, price, discount, stock_quantity, description, status }) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query(
        `UPDATE products
         SET name = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, stock_quantity = ?, description = ?, status = ?
         WHERE product_id = ?`,
        [name, category_id, brand_id, price, discount, stock_quantity, description, status, id]
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

  static async getImage(image_id) {
    try {
      const pool = await db.getConnection();
      const [rows] = await pool.query('SELECT image_url FROM product_images WHERE image_id = ?', [image_id]);
      return rows[0];
    } catch (error) {
      await logError(`Failed to get product image: ${error.message}`);
      throw error;
    }
  }

  static async deleteImage(image_id) {
    try {
      const pool = await db.getConnection();
      const [result] = await pool.query('DELETE FROM product_images WHERE image_id = ?', [image_id]);
      return result.affectedRows;
    } catch (error) {
      await logError(`Failed to delete product image: ${error.message}`);
      throw error;
    }
  }

  static async addImage(product_id, image_url, is_main = 0) {
    try {
      const pool = await db.getConnection();
      await pool.query(
        'INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
        [product_id, image_url, is_main]
      );
    } catch (error) {
      await logError(`Failed to add product image: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ProductModel;
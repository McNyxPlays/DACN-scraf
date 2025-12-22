// src/controllers/productController.js

const db = require('../config/db');
const { logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');
const redisClient = require('../config/redis');
const ProductModel = require('../models/productModel');

const uploadDir = path.join(__dirname, '../uploads/products'); 
fs.mkdir(uploadDir, { recursive: true }).catch(err => 
  logError(`Failed to create upload directory: ${err.message}`)
);

const mapStatusToFlags = (status) => {
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
    case 'new':
      flags.is_new = true;
      break;
    case 'used':
      flags.is_used = true;
      break;
    case 'custom':
      flags.is_custom = true;
      break;
    case 'hot':
      flags.is_hot = true;
      break;
    case 'unavailable':
      flags.is_available = false;
      break;
    case 'sale':
    case 'on_sale':
      flags.is_on_sale = true;
      break;
  }

  return flags;
};

const getUserRole = async (user_id) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const [rows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [user_id]);
    return rows[0]?.role || 'user';
  } catch (err) {
    logError(`getUserRole error: ${err.message}`);
    return 'user';
  } finally {
    if (pool) pool.release();
  }
};

// Lấy danh sách categories (public)
const getCategories = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const [rows] = await pool.query(`
      SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id AND p.is_available = TRUE
      GROUP BY c.category_id
      ORDER BY c.name
    `);
    res.json({ status: 'success', data: rows });
  } catch (err) {
    logError(`getCategories error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (pool) pool.release();
  }
};

// Lấy danh sách brands (public)
const getBrands = async (req, res) => {
  let pool = null;
  try {
    pool = await db.getConnection();
    const [rows] = await pool.query('SELECT brand_id, name FROM brands ORDER BY name');
    res.json({ status: 'success', data: rows });
  } catch (err) {
    logError(`getBrands error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (pool) pool.release();
  }
};

// Lấy chi tiết sản phẩm (public)
const getProduct = async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
  }

  let pool = null;
  try {
    pool = await db.getConnection();
    const [rows] = await pool.query(
      `SELECT p.*, c.name as category_name, b.name as brand_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.category_id
       LEFT JOIN brands b ON p.brand_id = b.brand_id
       WHERE p.product_id = ?`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    const product = rows[0];

    const [images] = await pool.query(
      'SELECT image_id, image_url, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, image_id ASC',
      [id]
    );

    product.images = images.map(img => ({
      image_id: img.image_id,
      image_url: `/uploads/products/${img.image_url}`,
      is_main: img.is_main
    }));

    res.json({ status: 'success', product });
  } catch (err) {
    logError(`getProduct error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (pool) pool.release();
  }
};

// Lấy danh sách sản phẩm (public)
const getProducts = async (req, res) => {
  const {
    search,
    category_id,
    brand_id,
    min_price,
    max_price,
    sort_by = 'created_at',
    order = 'DESC',
    limit = 20,
    page = 1
  } = req.query;

  let pool = null;
  try {
    pool = await db.getConnection();

    let query = `
      SELECT p.product_id, p.name, p.price, p.discount, p.stock_quantity,
             (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_main = TRUE LIMIT 1) as main_image
      FROM products p
      WHERE 1=1
    `;
    const params = [];

    if (search?.trim()) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (category_id && !isNaN(parseInt(category_id))) {
      query += ' AND p.category_id = ?';
      params.push(parseInt(category_id));
    }

    if (brand_id && !isNaN(parseInt(brand_id))) {
      query += ' AND p.brand_id = ?';
      params.push(parseInt(brand_id));
    }

    if (min_price && !isNaN(parseFloat(min_price))) {
      query += ' AND p.price >= ?';
      params.push(parseFloat(min_price));
    }

    if (max_price && !isNaN(parseFloat(max_price))) {
      query += ' AND p.price <= ?';
      params.push(parseFloat(max_price));
    }

    query += ` ORDER BY p.${sort_by} ${order.toUpperCase()} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await pool.query(query, params);

    rows.forEach(p => {
      p.main_image = p.main_image ? `/uploads/products/${p.main_image}` : null;
    });

    res.json({ status: 'success', data: rows });
  } catch (err) {
    logError(`getProducts error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (pool) pool.release();
  }
};

const getProductMana = async (req, res) => {
  console.log('getProductMana called with query:', req.query);

  let pool = null;
  try {
    pool = await db.getConnection();

    if (req.query.id) {
      const id = parseInt(req.query.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
      }

      const [rows] = await pool.query(
        `SELECT p.*, c.name as category_name, b.name as brand_name
         FROM products p
         LEFT JOIN categories c ON p.category_id = c.category_id
         LEFT JOIN brands b ON p.brand_id = b.brand_id
         WHERE p.product_id = ?`,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({ status: 'error', message: 'Product not found' });
      }

      const product = rows[0];

      const [images] = await pool.query(
        'SELECT image_id, image_url, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, image_id ASC',
        [id]
      );

      product.images = images.map(img => ({
        image_id: img.image_id,
        image_url: `/uploads/products/${img.image_url}`,
        is_main: img.is_main
      }));

      res.json({ status: 'success', data: [product] });
    } else {
      // Danh sách sản phẩm
      const search = req.query.search ? `%${req.query.search}%` : '%';
      const category_id = req.query.category_id ? parseInt(req.query.category_id) : null;
      const brand_id = req.query.brand_id ? parseInt(req.query.brand_id) : null;
      const status = req.query.status || null;

      let query = `
        SELECT p.product_id, p.name, p.price, p.discount, p.stock_quantity, p.description,
               (SELECT image_url FROM product_images WHERE product_id = p.product_id AND is_main = TRUE LIMIT 1) as main_image,
               c.name as category_name, b.name as brand_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.category_id
        LEFT JOIN brands b ON p.brand_id = b.brand_id
        WHERE (p.name LIKE ? OR p.description LIKE ?)
      `;
      const params = [search, search];

      if (category_id) {
        query += ' AND p.category_id = ?';
        params.push(category_id);
      }
      if (brand_id) {
        query += ' AND p.brand_id = ?';
        params.push(brand_id);
      }
      if (status) {
        const flags = mapStatusToFlags(status);
        query += ' AND p.is_new = ? AND p.is_used = ? AND p.is_custom = ? AND p.is_hot = ? AND p.is_available = ? AND p.is_on_sale = ?';
        params.push(flags.is_new, flags.is_used, flags.is_custom, flags.is_hot, flags.is_available, flags.is_on_sale);
      }

      const [products] = await pool.query(query, params);

      products.forEach(p => {
        p.main_image = p.main_image ? `/uploads/products/${p.main_image}` : null;
      });

      res.json({ status: 'success', data: products });
    }
  } catch (err) {
    logError(`getProductMana error: ${err.message}`);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (pool) pool.release();
  }
};

// Thêm sản phẩm mới
const addProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  let pool = null;
  try {
    pool = await db.getConnection();
    await pool.beginTransaction();

    const {
      name, category_id, brand_id, price, discount = 0, stock_quantity,
      description, status = 'new', nft_id
    } = req.body;

    if (!name?.trim() || !price || isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      throw new Error('Invalid product data');
    }

    const flags = mapStatusToFlags(status);

    const [result] = await pool.query(
      `INSERT INTO products (name, category_id, brand_id, user_id, price, discount, stock_quantity, description,
                             is_new, is_used, is_custom, is_hot, is_available, is_on_sale, nft_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), category_id || null, brand_id || null, req.session.user_id, parseFloat(price), parseFloat(discount),
       parseInt(stock_quantity) || 0, description || null, flags.is_new, flags.is_used, flags.is_custom, flags.is_hot,
       flags.is_available, flags.is_on_sale, nft_id || null]
    );

    const productId = result.insertId;

    // Handle image uploads
    const files = req.files || [];
    if (files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = `${Date.now()}_${i}${path.extname(file.originalname)}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, file.buffer);

        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
          [productId, filename, i === 0]
        );
      }
    }

    await pool.commit();
    res.json({ status: 'success', message: 'Product added successfully', product_id: productId });
  } catch (err) {
    if (pool) await pool.rollback();
    logError(`addProduct error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to add product' });
  } finally {
    if (pool) pool.release();
  }
};

// Cập nhật sản phẩm
const updateProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  let pool = null;
  try {
    pool = await db.getConnection();
    await pool.beginTransaction();

    const product_id = parseInt(req.query.id);
    if (isNaN(product_id) || product_id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const {
      name, category_id, brand_id, price, discount, stock_quantity,
      description, status, nft_id
    } = req.body;

    const flags = mapStatusToFlags(status);

    await pool.query(
      `UPDATE products SET name = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, stock_quantity = ?,
                           description = ?, is_new = ?, is_used = ?, is_custom = ?, is_hot = ?, is_available = ?,
                           is_on_sale = ?, nft_id = ?
       WHERE product_id = ?`,
      [name, category_id, brand_id, price, discount, stock_quantity, description,
       flags.is_new, flags.is_used, flags.is_custom, flags.is_hot, flags.is_available, flags.is_on_sale, nft_id, product_id]
    );

    // Remove specified images
    const removeImages = req.body.remove_images
      ? (Array.isArray(req.body.remove_images) ? req.body.remove_images : [req.body.remove_images])
      : [];

    for (const imgId of removeImages) {
      const imgIdNum = parseInt(imgId);
      if (!isNaN(imgIdNum)) {
        const [img] = await pool.query('SELECT image_url FROM product_images WHERE image_id = ?', [imgIdNum]);
        if (img.length) {
          await fs.unlink(path.join(uploadDir, img[0].image_url)).catch(() => {});
        }
        await pool.query('DELETE FROM product_images WHERE image_id = ?', [imgIdNum]);
      }
    }

    // Add new images
    const files = req.files || [];
    if (files.length > 0) {
      const [main] = await pool.query('SELECT image_id FROM product_images WHERE product_id = ? AND is_main = TRUE', [product_id]);
      const hasMain = main.length > 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filename = `${Date.now()}_${i}${path.extname(file.originalname)}`;
        const filepath = path.join(uploadDir, filename);
        await fs.writeFile(filepath, file.buffer);

        await pool.query(
          'INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
          [product_id, filename, !hasMain && i === 0]
        );
      }
    }

    await pool.commit();
    await redisClient.del(`product_${product_id}`);

    res.json({ status: 'success', message: 'Product updated successfully' });
  } catch (err) {
    if (pool) await pool.rollback();
    logError(`updateProduct error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to update product' });
  } finally {
    if (pool) pool.release();
  }
};

// Xóa sản phẩm
const deleteProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  let pool = null;
  try {
    pool = await db.getConnection();
    await pool.beginTransaction();

    const id = parseInt(req.query.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
    }

    const [images] = await pool.query('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
    for (const img of images) {
      await fs.unlink(path.join(uploadDir, img.image_url)).catch(() => {});
    }

    await pool.query('DELETE FROM product_images WHERE product_id = ?', [id]);

    await pool.query(
      'DELETE FROM products WHERE product_id = ? AND (user_id = ? OR ? = "admin")',
      [id, req.session.user_id, await getUserRole(req.session.user_id)]
    );

    await pool.commit();
    await redisClient.del(`product_${id}`);

    res.json({ status: 'success', message: 'Product deleted successfully' });
  } catch (err) {
    if (pool) await pool.rollback();
    logError(`deleteProduct error: ${err.message}`);
    res.status(500).json({ status: 'error', message: err.message || 'Failed to delete product' });
  } finally {
    if (pool) pool.release();
  }
};

module.exports = {
  getCategories,
  getBrands,
  getProduct,
  getProducts,
  getProductMana,
  addProduct,
  updateProduct,
  deleteProduct
};
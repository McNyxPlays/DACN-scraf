const db = require('../config/db');
const { logError } = require('../config/functions');
const path = require('path');

const getCategories = async (req, res) => {
  const query = `
    SELECT c.category_id, c.name, COUNT(p.product_id) as product_count
    FROM categories c
    LEFT JOIN products p ON c.category_id = p.category_id
    GROUP BY c.category_id, c.name
  `;
  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(query);
    res.json({ status: 'success', data: rows });
  } catch (error) {
    await logError('Failed to fetch categories: ' + error.message, query);
    console.error('Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: 'Failed to fetch categories: ' + error.message });
  }
};

const getBrands = async (req, res) => {
  const query = `
    SELECT b.brand_id, b.name, COUNT(p.product_id) as product_count
    FROM brands b
    LEFT JOIN products p ON b.brand_id = p.brand_id
    GROUP BY b.brand_id, b.name
  `;
  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(query);
    res.json({ status: 'success', data: rows });
  } catch (error) {
    await logError('Failed to fetch brands: ' + error.message, query);
    console.error('Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: 'Failed to fetch brands: ' + error.message });
  }
};

const getProduct = async (req, res) => {
  const id = parseInt(req.query.id);
  if (id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
  }
  const query = `
    SELECT p.product_id, p.name, p.description, p.price, p.status, p.stock_quantity, p.discount,
           c.name as category_name, b.name as brand_name, p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN brands b ON p.brand_id = b.brand_id
    WHERE p.product_id = ?
  `;
  try {
    const pool = await db.getConnection();
    const [productRows] = await pool.query(query, [id]);
    const product = productRows[0];
    if (!product) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }
    const [images] = await pool.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY is_main DESC, image_id ASC',
      [id]
    );
    product.images = images.length ? images.map(img => `/Uploads/products/${img.image_url}`) : ['/placeholder.jpg'];
    res.json({ status: 'success', data: product });
  } catch (error) {
    await logError('Failed to fetch product: ' + error.message, query, [id]);
    console.error('Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: 'Failed to fetch product: ' + error.message });
  }
};

const getProducts = async (req, res) => {
  const query = `
    SELECT p.product_id, p.name, p.description, p.price, p.status, p.stock_quantity, p.discount,
           c.name as category_name, b.name as brand_name, p.created_at
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.category_id
    LEFT JOIN brands b ON p.brand_id = b.brand_id
    WHERE p.name LIKE ?
    LIMIT ?, ?
  `;
  try {
    const pool = await db.getConnection();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const [rows] = await pool.query(query, [search, offset, limit]);
    const [total] = await pool.query('SELECT COUNT(*) as total FROM products WHERE name LIKE ?', [search]);
    res.json({
      status: 'success',
      data: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(total[0].total / limit),
        total_products: total[0].total
      }
    });
  } catch (error) {
    await logError('Failed to fetch products: ' + error.message, query, [search, offset, limit]);
    console.error('Error stack:', error.stack);
    res.status(500).json({ status: 'error', message: 'Failed to fetch products: ' + error.message });
  }
};

const deleteProductImage = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized - Not an admin' });
    }
    const imageId = parseInt(req.query.image_id);
    if (imageId <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid image ID' });
    }
    const [result] = await pool.query('DELETE FROM product_images WHERE image_id = ?', [imageId]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Image deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Image not found' });
    }
  } catch (error) {
    await logError('Failed to delete product image: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to delete product image: ' + error.message });
  }
};

const getProductMana = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized - Not an admin' });
    }
    const search = req.query.search ? `%${req.query.search}%` : '%';
    const [products] = await pool.query(`
      SELECT p.product_id, p.name, p.description, p.price, p.status, p.stock_quantity, p.discount,
             c.name as category_name, b.name as brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      WHERE p.name LIKE ?
    `, [search]);
    res.json({ success: true, data: products });
  } catch (error) {
    await logError('Failed to fetch products for management: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch products for management: ' + error.message });
  }
};

const addProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized - Not an admin' });
    }
    const { name, category_id, brand_id, price, discount, stock_quantity, description, status } = req.body;
    if (!name || !price || !status || stock_quantity < 0) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    const [result] = await pool.query(
      'INSERT INTO products (name, category_id, brand_id, price, discount, stock_quantity, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, category_id || null, brand_id || null, price, discount || 0, stock_quantity, description || '', status]
    );
    res.json({ success: true, message: 'Product added', data: { product_id: result.insertId } });
  } catch (error) {
    await logError('Failed to add product: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to add product: ' + error.message });
  }
};

const updateProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized - Not an admin' });
    }
    const id = parseInt(req.query.id);
    const { name, category_id, brand_id, price, discount, stock_quantity, description, status } = req.body;
    if (!name || id <= 0 || !price || !status || stock_quantity < 0) {
      return res.status(400).json({ success: false, error: 'Invalid input' });
    }
    const [existingProduct] = await pool.query('SELECT category_id, brand_id FROM products WHERE product_id = ?', [id]);
    if (!existingProduct.length) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    const [existingCategory] = await pool.query('SELECT category_id FROM categories WHERE category_id = ?', [category_id]);
    if (category_id && !existingCategory.length) {
      return res.status(400).json({ success: false, error: 'Invalid category' });
    }
    const [existingBrand] = await pool.query('SELECT brand_id FROM brands WHERE brand_id = ?', [brand_id]);
    if (brand_id && !existingBrand.length) {
      return res.status(400).json({ success: false, error: 'Invalid brand' });
    }
    await pool.query(
      'UPDATE products SET name = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, stock_quantity = ?, description = ?, status = ? WHERE product_id = ?',
      [name, category_id, brand_id, price, discount, stock_quantity, description, status, id]
    );
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    await logError('Failed to update product: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to update product: ' + error.message });
  }
};

const deleteProduct = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Unauthorized - Not an admin' });
    }
    const id = parseInt(req.query.id);
    if (id <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }
    const [result] = await pool.query('DELETE FROM products WHERE product_id = ?', [id]);
    if (result.affectedRows > 0) {
      res.json({ success: true, message: 'Product deleted' });
    } else {
      res.status(404).json({ success: false, error: 'Product not found' });
    }
  } catch (error) {
    await logError('Failed to delete product: ' + error.message);
    res.status(500).json({ success: false, error: 'Failed to delete product: ' + error.message });
  }
};

module.exports = { getCategories, getBrands, getProduct, getProducts, deleteProductImage, getProductMana, addProduct, updateProduct, deleteProduct };
// src/controllers/productController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const fs = require('fs').promises;
const path = require('path');
const app = require('../app');
const redisClient = require('../config/redis');

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
    case 'new': flags.is_new = true; break;
    case 'used': flags.is_used = true; break;
    case 'custom': flags.is_custom = true; break;
    case 'hot': flags.is_hot = true; break;
    case 'unavailable': flags.is_available = false; break;
    case 'sale':
    case 'on_sale': flags.is_on_sale = true; break;
  }
  return flags;
};

// ====================== PUBLIC ======================
const getCategories = async (req, res) => {
  const cacheKey = 'pub_categories';
  try {
    let data = await redisClient.get(cacheKey);
    if (data) return res.json({ status: 'success', data: JSON.parse(data) });

    const conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON c.category_id = p.category_id AND p.is_available = TRUE
      GROUP BY c.category_id, c.name
      ORDER BY c.name
    `);
    conn.release();

    await redisClient.set(cacheKey, JSON.stringify(rows), 'EX', 1800); // 30 phút
    res.json({ status: 'success', data: rows });
  } catch (err) {
    await logError('getCategories error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getBrands = async (req, res) => {
  const cacheKey = 'pub_brands';
  try {
    let data = await redisClient.get(cacheKey);
    if (data) return res.json({ status: 'success', data: JSON.parse(data) });

    const conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT b.brand_id, b.name, COUNT(p.product_id) AS product_count
      FROM brands b
      LEFT JOIN products p ON b.brand_id = p.brand_id AND p.is_available = TRUE
      GROUP BY b.brand_id, b.name
      ORDER BY b.name
    `);
    conn.release();

    await redisClient.set(cacheKey, JSON.stringify(rows), 'EX', 1800); // 30 phút
    res.json({ status: 'success', data: rows });
  } catch (err) {
    await logError('getBrands error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getProduct = async (req, res) => {
  const id = parseInt(req.params.id || req.query.id); 
  if (!id || isNaN(id)) return res.status(400).json({ status: 'error', message: 'Invalid product ID' });

  const cacheKey = `product_${id}`;
  try {
    let data = await redisClient.get(cacheKey);
    if (data) return res.json({ status: 'success', data: JSON.parse(data) });

    const conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT p.*, c.name AS category_name, b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = p.brand_id
      WHERE p.product_id = ? AND p.is_available = TRUE
    `, [id]);
    conn.release();

    if (rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    await redisClient.set(cacheKey, JSON.stringify(rows[0]), 'EX', 3600); // 1 giờ
    res.json({ status: 'success', data: rows[0] });
  } catch (err) {
    await logError('getProduct error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getProducts = async (req, res) => {
  let {
    page = 1,
    limit = 20,
    sort = 'popularity',
    search,
    category_ids,
    brand_ids,
    status_new,
    status_used,
    status_custom,
    status_hot,
    status_available = 'true',
    status_on_sale
  } = req.query;

  page = Math.max(1, parseInt(page) || 1);
  limit = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset = (page - 1) * limit;

  // === Xây dựng WHERE ===
  const whereConditions = [];
  const queryParams = [];

  if (status_available === 'true') whereConditions.push('p.is_available = TRUE');
  if (status_available === 'false') whereConditions.push('p.is_available = FALSE');

  if (search) {
    whereConditions.push('(p.name LIKE ? OR p.description LIKE ?)');
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (category_ids) {
    const cats = category_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (cats.length) {
      whereConditions.push(`p.category_id IN (${cats.map(() => '?').join(',')})`);
      queryParams.push(...cats);
    }
  }

  if (brand_ids) {
    const brands = brand_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
    if (brands.length) {
      whereConditions.push(`p.brand_id IN (${brands.map(() => '?').join(',')})`);
      queryParams.push(...brands);
    }
  }

  if (status_new === 'true') whereConditions.push('p.is_new = TRUE');
  if (status_used === 'true') whereConditions.push('p.is_used = TRUE');
  if (status_custom === 'true') whereConditions.push('p.is_custom = TRUE');
  if (status_hot === 'true') whereConditions.push('p.is_hot = TRUE');
  if (status_on_sale === 'true') whereConditions.push('p.is_on_sale = TRUE');

  const whereClause = whereConditions.length ? 'AND ' + whereConditions.join(' AND ') : '';

  // === ORDER BY an toàn (whitelist) ===
  let orderBy = 'p.created_at DESC';
  switch (sort) {
    case 'price_low':  orderBy = '(p.price * (1 - p.discount/100)) ASC'; break;
    case 'price_high': orderBy = '(p.price * (1 - p.discount/100)) DESC'; break;
    case 'newest':     orderBy = 'p.created_at DESC'; break;
    case 'popularity': orderBy = '(p.stock_quantity > 0) DESC, p.created_at DESC'; break;
    default:           orderBy = 'p.created_at DESC';
  }

  // === Cache key ===
  const cacheKey = `products:${page}:${limit}:${sort}:${search||''}:${category_ids||''}:${brand_ids||''}:${status_new||''}:${status_on_sale||''}:${status_available||''}`;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const conn = await db.getConnection();

    // Query chính – KHÔNG CÓ COMMENT TRONG CHUỖI SQL!
    const [rows] = await conn.query(`
      SELECT 
        p.*,
        c.name AS category_name,
        b.name AS brand_name,
        pi.image_url AS main_image,
        (p.price * (1 - p.discount/100)) AS discounted_price
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
      WHERE 1=1 ${whereClause}
      GROUP BY p.product_id
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    // Đếm tổng cho pagination
    const [countResult] = await conn.query(`
      SELECT COUNT(DISTINCT p.product_id) AS total
      FROM products p
      WHERE 1=1 ${whereClause}
    `, queryParams);

    const totalProducts = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    conn.release();

    const result = {
      status: 'success',
      data: rows,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_products: totalProducts,
        per_page: limit
      }
    };

    await redisClient.set(cacheKey, JSON.stringify(result), 'EX', 300);
    res.json(result);
  } catch (err) {
    await logError('getProducts error: ' + err.message);
    console.error('getProducts error:', err);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ====================== MANAGEMENT (AUTH REQUIRED) ======================
const getProductMana = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const id = parseInt(req.query.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid ID' });

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(`
      SELECT p.*, c.name AS category_name, b.name AS brand_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      LEFT JOIN brands b ON p.brand_id = p.brand_id
      WHERE p.product_id = ? AND (p.user_id = ? OR ? = 'admin')
    `, [id, req.session.user_id, (await getUserRole(req.session.user_id))]);

    if (!rows.length) {
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Product not found or unauthorized' });
    }

    const product = rows[0];

    const [images] = await conn.query(`
      SELECT image_id, image_url, is_main
      FROM product_images
      WHERE product_id = ?
      ORDER BY is_main DESC
    `, [id]);
    product.images = images;

    conn.release();
    res.json({ status: 'success', data: product });
  } catch (err) {
    await logError('getProductMana error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const addProduct = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { name, category_id, brand_id, price, discount, stock_quantity, description, status } = req.body;
  const images = req.files?.images;

  const flags = mapStatusToFlags(status);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    const [result] = await conn.query(`
      INSERT INTO products (user_id, name, category_id, brand_id, price, discount, stock_quantity, description,
        is_new, is_used, is_custom, is_hot, is_available, is_on_sale)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.session.user_id, name, category_id || null, brand_id || null, price, discount || 0, stock_quantity || 0, description || '',
      flags.is_new, flags.is_used, flags.is_custom, flags.is_hot, flags.is_available, flags.is_on_sale]);

    const product_id = result.insertId;

    if (images && images.length) {
      const upload_dir = path.join(__dirname, '../Uploads/products');
      await fs.mkdir(upload_dir, { recursive: true });

      for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;

        const filename = `${product_id}_${Date.now()}_${i}${ext}`;
        const filepath = path.join(upload_dir, filename);
        await fs.writeFile(filepath, file.buffer);

        const url = `products/${filename}`;
        await conn.query('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
          [product_id, url, i === 0]);
      }
    }

    await conn.query('COMMIT');

    await redisClient.del('pub_categories');
    await redisClient.del('pub_brands');

    res.json({ status: 'success', product_id });
  } catch (err) {
    await conn.query('ROLLBACK');
    await logError('addProduct error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const updateProduct = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const id = parseInt(req.query.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid ID' });

  const { name, category_id, brand_id, price, discount, stock_quantity, description, status } = req.body;
  const newImages = req.files?.newImages; 

  const flags = mapStatusToFlags(status);

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    const [product] = await conn.query('SELECT user_id FROM products WHERE product_id = ?', [id]);
    if (!product.length || (product[0].user_id !== req.session.user_id && await getUserRole(req.session.user_id) !== 'admin')) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    await conn.query(`
      UPDATE products SET name = ?, category_id = ?, brand_id = ?, price = ?, discount = ?, stock_quantity = ?, description = ?,
      is_new = ?, is_used = ?, is_custom = ?, is_hot = ?, is_available = ?, is_on_sale = ?
      WHERE product_id = ?
    `, [name, category_id || null, brand_id || null, price, discount || 0, stock_quantity || 0, description || '',
      flags.is_new, flags.is_used, flags.is_custom, flags.is_hot, flags.is_available, flags.is_on_sale, id]);

    if (newImages && newImages.length) {
      const upload_dir = path.join(__dirname, '../Uploads/products');
      await fs.mkdir(upload_dir, { recursive: true });

      for (let i = 0; i < newImages.length; i++) {
        const file = newImages[i];
        const ext = path.extname(file.originalname).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;

        const filename = `${id}_${Date.now()}_${i}${ext}`;
        const filepath = path.join(upload_dir, filename);
        await fs.writeFile(filepath, file.buffer);

        const url = `products/${filename}`;
        await conn.query('INSERT INTO product_images (product_id, image_url, is_main) VALUES (?, ?, ?)',
          [id, url, false]);
      }
    }

    await conn.query('COMMIT');

    await redisClient.del(`product_${id}`);
    await redisClient.del('pub_categories');
    await redisClient.del('pub_brands');

    res.json({ status: 'success', message: 'Product updated' });
  } catch (err) {
    await conn.query('ROLLBACK');
    await logError('updateProduct error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const deleteProduct = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  const id = parseInt(req.query.id);
  if (!id) return res.status(400).json({ status: 'error', message: 'Invalid ID' });

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    const [product] = await conn.query('SELECT user_id FROM products WHERE product_id = ?', [id]);
    if (!product.length || (product[0].user_id !== req.session.user_id && await getUserRole(req.session.user_id) !== 'admin')) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    // Delete images files
    const [images] = await conn.query('SELECT image_url FROM product_images WHERE product_id = ?', [id]);
    for (let img of images) {
      const filepath = path.join(__dirname, '../Uploads/', img.image_url);
      await fs.unlink(filepath).catch(() => {}); // Ignore if not found
    }

    await conn.query('DELETE FROM product_images WHERE product_id = ?', [id]);
    await conn.query('DELETE FROM products WHERE product_id = ?', [id]);

    await conn.query('COMMIT');

    await redisClient.del(`product_${id}`);
    await redisClient.del('pub_categories');
    await redisClient.del('pub_brands');

    res.json({ status: 'success', message: 'Product deleted' });
  } catch (err) {
    await conn.query('ROLLBACK');
    await logError('deleteProduct error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

const deleteProductImage = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { image_id, product_id } = req.body;
  if (!image_id || !product_id) return res.status(400).json({ status: 'error', message: 'Invalid params' });

  let conn;
  try {
    conn = await db.getConnection();

    const [product] = await conn.query('SELECT user_id FROM products WHERE product_id = ?', [product_id]);
    if (!product.length || (product[0].user_id !== req.session.user_id && await getUserRole(req.session.user_id) !== 'admin')) {
      return res.status(403).json({ status: 'error', message: 'Unauthorized' });
    }

    const [image] = await conn.query('SELECT image_url FROM product_images WHERE image_id = ? AND product_id = ?', [image_id, product_id]);
    if (!image.length) return res.status(404).json({ status: 'error', message: 'Image not found' });

    const filepath = path.join(__dirname, '../Uploads/', image[0].image_url);
    await fs.unlink(filepath).catch(() => {});

    await conn.query('DELETE FROM product_images WHERE image_id = ?', [image_id]);

    // If deleted main, set new main if any
    const [remaining] = await conn.query('SELECT image_id FROM product_images WHERE product_id = ? LIMIT 1', [product_id]);
    if (remaining.length) {
      await conn.query('UPDATE product_images SET is_main = TRUE WHERE image_id = ?', [remaining[0].image_id]);
    }

    await redisClient.del(`product_${product_id}`);

    res.json({ status: 'success', message: 'Image deleted' });
  } catch (err) {
    await logError('deleteProductImage error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

// Helper: Get user role (giả sử, implement nếu cần)
const getUserRole = async (user_id) => {
  const conn = await db.getConnection();
  const [user] = await conn.query('SELECT role FROM users WHERE user_id = ?', [user_id]);
  conn.release();
  return user[0]?.role || 'user';
};

module.exports = {
  getCategories,
  getBrands,
  getProduct,
  getProducts,
  getProductMana,
  addProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
};
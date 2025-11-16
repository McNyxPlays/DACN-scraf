// src/controllers/favoriteController.js
const db = require('../config/db');
const { logError } = require('../config/functions');

const getFavorites = async (req, res) => {
  const user_id = parseInt(req.query.user_id);
  if (user_id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
  }

  if (req.session.user_id && user_id !== req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Session mismatch' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE', [user_id]);
    if (!userRows[0]) {
      return res.status(401).json({ status: 'error', message: 'User not found or inactive' });
    }

    const [favorites] = await pool.query(
      `SELECT usi.saved_id, p.product_id, p.name, p.price, pi.image_url
       FROM user_saved_items usi
       JOIN products p ON usi.product_id = p.product_id
       LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
       WHERE usi.user_id = ? AND usi.save_type = 'favorite' AND usi.product_id IS NOT NULL`,
      [user_id]
    );

    const formattedFavorites = favorites.map(item => ({
      saved_id: item.saved_id,
      product_id: item.product_id,
      name: item.name,
      price: item.price,
      image: item.image_url ? `/Uploads/${item.image_url}` : '/placeholder.jpg'
    }));

    res.json({ status: 'success', favorites: formattedFavorites });
  } catch (error) {
    await logError('Error in favorites: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const addFavorite = async (req, res) => {
  const { user_id, product_id } = req.body;

  if (user_id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
  }
  if (product_id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid product ID' });
  }

  if (req.session.user_id && user_id !== req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Session mismatch' });
  }

  try {
    const pool = await db.getConnection();
    const [userRows] = await pool.query('SELECT user_id FROM users WHERE user_id = ? AND is_active = TRUE', [user_id]);
    if (!userRows[0]) {
      return res.status(401).json({ status: 'error', message: 'User not found or inactive' });
    }

    const [productRows] = await pool.query('SELECT product_id FROM products WHERE product_id = ?', [product_id]);
    if (!productRows[0]) {
      return res.status(404).json({ status: 'error', message: 'Product not found' });
    }

    const [existingRows] = await pool.query(
      'SELECT saved_id FROM user_saved_items WHERE user_id = ? AND product_id = ? AND save_type = "favorite"',
      [user_id, product_id]
    );
    if (existingRows[0]) {
      return res.status(400).json({ status: 'error', message: 'Product already in favorites' });
    }

    const [result] = await pool.query(
      'INSERT INTO user_saved_items (user_id, product_id, save_type) VALUES (?, ?, "favorite")',
      [user_id, product_id]
    );
    res.json({ status: 'success', saved_id: result.insertId });
  } catch (error) {
    await logError('Error in favorites: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const deleteFavorite = async (req, res) => {
  const { saved_id, user_id } = req.body;

  if (saved_id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid saved ID' });
  }
  if (user_id <= 0) {
    return res.status(400).json({ status: 'error', message: 'Invalid user ID' });
  }

  if (req.session.user_id && user_id !== req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Session mismatch' });
  }

  try {
    const pool = await db.getConnection();
    const [result] = await pool.query(
      'DELETE FROM user_saved_items WHERE saved_id = ? AND user_id = ? AND save_type = "favorite"',
      [saved_id, user_id]
    );

    if (result.affectedRows > 0) {
      res.json({ status: 'success' });
    } else {
      res.status(400).json({ status: 'error', message: 'Invalid saved_id or user_id' });
    }
  } catch (error) {
    await logError('Error in favorites: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = { getFavorites, addFavorite, deleteFavorite };
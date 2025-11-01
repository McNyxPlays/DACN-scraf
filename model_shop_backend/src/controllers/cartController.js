const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');

const addGuestCart = async (req, res) => {
  const { session_key, product_id, quantity = 1 } = req.body;

  if (!session_key || !product_id || quantity <= 0) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid parameters' });
  }

  try {
    const pool = await db.getConnection();
    const [productRows] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [product_id]);
    const product = productRows[0];

    if (!product) {
      return res.status(400).json({ status: 'error', message: 'Invalid product_id' });
    }
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
    }

    const [existingRows] = await pool.query(
      'SELECT guest_cart_id, quantity FROM guest_carts WHERE session_key = ? AND product_id = ?',
      [session_key, product_id]
    );
    const existing = existingRows[0];

    if (existing) {
      const new_quantity = existing.quantity + quantity;
      if (product.stock_quantity < new_quantity) {
        return res.status(400).json({ status: 'error', message: 'Insufficient stock for updated quantity' });
      }
      await pool.query(
        'UPDATE guest_carts SET quantity = ? WHERE guest_cart_id = ? AND session_key = ?',
        [new_quantity, existing.guest_cart_id, session_key]
      );
    } else {
      await pool.query(
        'INSERT INTO guest_carts (session_key, product_id, quantity) VALUES (?, ?, ?)',
        [session_key, product_id, quantity]
      );
    }

    res.json({ status: 'success', message: 'Added to guest cart' });
  } catch (error) {
    await logError('Database error in guest_carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getGuestCart = async (req, res) => {
  const session_key = req.query.session_key || req.body.session_key;

  if (!session_key) {
    return res.status(400).json({ status: 'error', message: 'Missing session_key' });
  }

  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(`
      SELECT gc.guest_cart_id, gc.quantity, p.product_id, p.name, p.price, p.description
      FROM guest_carts gc
      JOIN products p ON gc.product_id = p.product_id
      WHERE gc.session_key = ?
    `, [session_key]);
    res.json({ status: 'success', items: rows });
  } catch (error) {
    await logError('Database error in guest_carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const updateGuestCart = async (req, res) => {
  const { guest_cart_id, session_key, quantity } = req.body;

  if (!guest_cart_id || !session_key || quantity <= 0) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid parameters' });
  }

  try {
    const pool = await db.getConnection();
    const [cartRows] = await pool.query(
      'SELECT product_id FROM guest_carts WHERE guest_cart_id = ? AND session_key = ?',
      [guest_cart_id, session_key]
    );
    const cartItem = cartRows[0];

    if (!cartItem) {
      return res.status(400).json({ status: 'error', message: 'Invalid guest_cart_id or session_key' });
    }

    const [productRows] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [cartItem.product_id]);
    const product = productRows[0];

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
    }

    await pool.query(
      'UPDATE guest_carts SET quantity = ? WHERE guest_cart_id = ? AND session_key = ?',
      [quantity, guest_cart_id, session_key]
    );
    res.json({ status: 'success', message: 'Quantity updated' });
  } catch (error) {
    await logError('Database error in guest_carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const deleteGuestCart = async (req, res) => {
  const { guest_cart_id, session_key } = req.body;

  try {
    const pool = await db.getConnection();
    if (guest_cart_id) {
      const [result] = await pool.query(
        'DELETE FROM guest_carts WHERE guest_cart_id = ? AND session_key = ?',
        [guest_cart_id, session_key]
      );
      if (result.affectedRows > 0) {
        res.json({ status: 'success', message: 'Item removed from guest cart' });
      } else {
        res.status(400).json({ status: 'error', message: 'Invalid guest_cart_id or session_key' });
      }
    } else if (session_key) {
      const [result] = await pool.query('DELETE FROM guest_carts WHERE session_key = ?', [session_key]);
      res.json({ status: 'success', message: result.affectedRows > 0 ? 'All items removed from guest cart' : 'Guest cart is already empty' });
    } else {
      res.status(400).json({ status: 'error', message: 'Missing guest_cart_id or session_key' });
    }
  } catch (error) {
    await logError('Database error in guest_carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const addCart = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;
  const { product_id, quantity = 1 } = req.body;

  if (!product_id || quantity <= 0) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid parameters' });
  }

  try {
    const pool = await db.getConnection();
    const [productRows] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [product_id]);
    const product = productRows[0];

    if (!product) {
      return res.status(400).json({ status: 'error', message: 'Invalid product_id' });
    }
    if (product.stock_quantity < quantity) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
    }

    const [existingRows] = await pool.query(
      'SELECT cart_id, quantity FROM carts WHERE user_id = ? AND product_id = ?',
      [user_id, product_id]
    );
    const existing = existingRows[0];

    if (existing) {
      const new_quantity = existing.quantity + quantity;
      if (product.stock_quantity < new_quantity) {
        return res.status(400).json({ status: 'error', message: 'Insufficient stock for updated quantity' });
      }
      await pool.query(
        'UPDATE carts SET quantity = ? WHERE cart_id = ? AND user_id = ?',
        [new_quantity, existing.cart_id, user_id]
      );
    } else {
      await pool.query(
        'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [user_id, product_id, quantity]
      );
    }

    res.json({ status: 'success', message: 'Added to cart' });
  } catch (error) {
    await logError('Database error in carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getCart = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;

  try {
    const pool = await db.getConnection();
    const [rows] = await pool.query(`
      SELECT c.cart_id, c.quantity, p.product_id, p.name, p.price, p.description
      FROM carts c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `, [user_id]);
    res.json({ status: 'success', items: rows });
  } catch (error) {
    await logError('Database error in carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const updateCart = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;
  const { cart_id, quantity } = req.body;

  if (!cart_id || quantity <= 0) {
    return res.status(400).json({ status: 'error', message: 'Missing or invalid parameters' });
  }

  try {
    const pool = await db.getConnection();
    const [cartRows] = await pool.query(
      'SELECT product_id FROM carts WHERE cart_id = ? AND user_id = ?',
      [cart_id, user_id]
    );
    const cartItem = cartRows[0];

    if (!cartItem) {
      return res.status(400).json({ status: 'error', message: 'Invalid cart_id or user_id' });
    }

    const [productRows] = await pool.query('SELECT stock_quantity FROM products WHERE product_id = ?', [cartItem.product_id]);
    const product = productRows[0];

    if (product.stock_quantity < quantity) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
    }

    await pool.query(
      'UPDATE carts SET quantity = ? WHERE cart_id = ? AND user_id = ?',
      [quantity, cart_id, user_id]
    );
    res.json({ status: 'success', message: 'Quantity updated' });
  } catch (error) {
    await logError('Database error in carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const deleteCart = async (req, res) => {
  if (!req.session.user_id) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Please log in' });
  }

  const user_id = req.session.user_id;
  const { cart_id } = req.body;

  try {
    const pool = await db.getConnection();
    if (cart_id) {
      const [result] = await pool.query(
        'DELETE FROM carts WHERE cart_id = ? AND user_id = ?',
        [cart_id, user_id]
      );
      if (result.affectedRows > 0) {
        res.json({ status: 'success', message: 'Item removed from cart' });
      } else {
        res.status(400).json({ status: 'error', message: 'Invalid cart_id or user_id' });
      }
    } else {
      const [result] = await pool.query('DELETE FROM carts WHERE user_id = ?', [user_id]);
      res.json({ status: 'success', message: result.affectedRows > 0 ? 'All items removed from cart' : 'Cart is already empty' });
    }
  } catch (error) {
    await logError('Database error in carts: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = { addGuestCart, getGuestCart, updateGuestCart, deleteGuestCart, addCart, getCart, updateCart, deleteCart };
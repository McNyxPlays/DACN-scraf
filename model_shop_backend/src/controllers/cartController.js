// src/controllers/cartController.js
const db = require('../config/db');
const { logError } = require('../config/functions');
const app = require('../app');
const redisClient = require('../config/redis');

// Helper: lấy identifier (user_id hoặc session_key)
const getCartIdentifier = (req) => ({
  user_id: req.session.user_id || null,
  session_key: req.session.user_id ? null : (req.body.session_key || req.query.session_key)
});

/* ==================== THÊM VÀO GIỎ HÀNG (user + guest) ==================== */
const addToCart = async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const { user_id, session_key } = getCartIdentifier(req);

  if (!user_id && !session_key) return res.status(400).json({ status: 'error', message: 'Missing identifier' });
  if (!product_id || quantity < 1) return res.status(400).json({ status: 'error', message: 'Invalid params' });

  let conn;
  try {
    conn = await db.getConnection();

    // Kiểm tra tồn kho
    const [prod] = await conn.query('SELECT stock_quantity FROM products WHERE product_id = ?', [product_id]);
    if (!prod.length || prod[0].stock_quantity < quantity) {
      return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
    }

    // Kiểm tra đã có trong giỏ chưa
    let sql = 'SELECT cart_id, quantity FROM carts WHERE product_id = ? AND ';
    let params = [product_id];
    if (user_id) { sql += 'user_id = ?'; params.push(user_id); }
    else { sql += 'session_key = ?'; params.push(session_key); }

    const [existing] = await conn.query(sql, params);

    if (existing.length) {
      const newQty = existing[0].quantity + quantity;
      if (prod[0].stock_quantity < newQty) return res.status(400).json({ status: 'error', message: 'Insufficient stock' });
      await conn.query('UPDATE carts SET quantity = ? WHERE cart_id = ?', [newQty, existing[0].cart_id]);
    } else {
      const insertSql = user_id
        ? 'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)'
        : 'INSERT INTO carts (session_key, product_id, quantity) VALUES (?, ?, ?)';
      await conn.query(insertSql, [user_id || session_key, product_id, quantity]);
    }

    // Invalidate cache (thêm cho guest)
    const cacheKey = user_id ? `cart_count_${user_id}` : `cart_count_guest_${session_key}`;
    await redisClient.del(cacheKey);

    res.json({ status: 'success', message: 'Added to cart' });
  } catch (err) {
    await logError('addToCart: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

/* ==================== LẤY GIỎ HÀNG ==================== */
const getCart = async (req, res) => {
  const { user_id, session_key } = getCartIdentifier(req);

  // Debug log để kiểm tra identifier (xóa sau khi test)
  console.log('getCart identifier:', { user_id, session_key, query: req.query });

  if (!user_id && !session_key) {
    return res.status(400).json({ status: 'error', message: 'Missing identifier' });
  }

  let conn;
  try {
    conn = await db.getConnection();

    let sql, params;

    if (user_id) {
      sql = `SELECT 
               c.cart_id, c.quantity, 
               p.product_id, p.name, p.price, p.discount,
               (SELECT pi.image_url 
                FROM product_images pi 
                WHERE pi.product_id = p.product_id AND pi.is_main = TRUE 
                LIMIT 1) AS main_image
             FROM carts c 
             JOIN products p ON c.product_id = p.product_id 
             WHERE c.user_id = ?`;
      params = [user_id];
    } else {
      sql = `SELECT 
               c.cart_id, c.quantity, 
               p.product_id, p.name, p.price, p.discount,
               (SELECT pi.image_url 
                FROM product_images pi 
                WHERE pi.product_id = p.product_id AND pi.is_main = TRUE 
                LIMIT 1) AS main_image
             FROM carts c 
             JOIN products p ON c.product_id = p.product_id 
             WHERE c.session_key = ?`;
      params = [session_key];
    }

    const [items] = await conn.query(sql, params);

    res.json({ status: 'success', items }); // Trả về "items" để khớp với cartSlice.js
  } catch (err) {
    console.error('getCart error:', err.message); // Log lỗi chi tiết
    await logError('getCart: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

/* ==================== CẬP NHẬT SỐ LƯỢNG ==================== */
const updateCart = async (req, res) => {
  const { cart_id, quantity } = req.body;
  const { user_id, session_key } = getCartIdentifier(req);

  if (!cart_id || quantity < 1) return res.status(400).json({ status: 'error', message: 'Invalid params' });

  let conn;
  try {
    conn = await db.getConnection();
    const where = user_id ? 'AND user_id = ?' : 'AND session_key = ?';
    const param = user_id || session_key;

    await conn.query(`UPDATE carts SET quantity = ? WHERE cart_id = ? ${where}`, [quantity, cart_id, param]);
    const cacheKey = user_id ? `cart_count_${user_id}` : `cart_count_guest_${session_key}`;
    redisClient.del(cacheKey);

    res.json({ status: 'success', message: 'Updated' });
  } catch (err) {
    await logError('updateCart: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

/* ==================== XÓA ==================== */
const deleteCart = async (req, res) => {
  const { cart_id } = req.body;
  const { user_id, session_key } = getCartIdentifier(req);

  let conn;
  try {
    conn = await db.getConnection();
    const where = user_id ? 'AND user_id = ?' : 'AND session_key = ?';
    const param = user_id || session_key;

    if (cart_id) {
      await conn.query(`DELETE FROM carts WHERE cart_id = ? ${where}`, [cart_id, param]);
    } else {
      await conn.query(`DELETE FROM carts WHERE ${user_id ? 'user_id' : 'session_key'} = ?`, [param]);
    }

    const cacheKey = user_id ? `cart_count_${user_id}` : `cart_count_guest_${session_key}`;
    redisClient.del(cacheKey);
    res.json({ status: 'success', message: 'Deleted' });
  } catch (err) {
    await logError('deleteCart: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { addToCart, getCart, updateCart, deleteCart };
// src/controllers/orderController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const crypto = require('crypto');

const getCsrfToken = async (req, res) => {
  try {
    const csrfToken = crypto.randomBytes(32).toString('hex');
    req.session.csrfToken = csrfToken;
    res.json({ status: 'success', csrf_token: csrfToken });
  } catch (error) {
    await logError('Error generating CSRF: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const createOrder = async (req, res) => {
  const {
    csrf_token,
    full_name,
    address,
    guest_email,        // giữ tên cũ để frontend không cần sửa
    guest_phone,        // giữ tên cũ
    shipping_method = 'standard',
    payment_method = 'cod',
    store_id,
    promotion_id,
    session_key
  } = req.body;

  const user_id = req.session.user_id;

  // CSRF check
  if (csrf_token !== req.session.csrfToken) {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }

  if (!full_name || !address) {
    return res.status(400).json({ status: 'error', message: 'Full name and address required' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    // Xác định giỏ hàng (user hoặc guest)
    const identifier = user_id
      ? { field: 'user_id', value: user_id }
      : { field: 'session_key', value: session_key };

    if (!identifier.value) {
      throw new Error('No user_id or session_key provided');
    }

    // Lấy sản phẩm trong giỏ
    const [cartItems] = await conn.query(`
      SELECT c.product_id, c.quantity, p.price, p.discount, p.name
      FROM carts c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.${identifier.field} = ?
    `, [identifier.value]);

    if (cartItems.length === 0) {
      throw new Error('Cart is empty');
    }

    // Tính tiền
    let subtotal = 0;
    cartItems.forEach(item => {
      const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      subtotal += price * item.quantity;
    });

    let discount_amount = 0;
    if (promotion_id) {
      const [promo] = await conn.query(
        'SELECT discount_percentage FROM promotions WHERE promotion_id = ? AND status = "active"',
        [promotion_id]
      );
      if (promo.length > 0) {
        discount_amount = subtotal * (promo[0].discount_percentage / 100);
        subtotal -= discount_amount;
        await conn.query('UPDATE promotions SET usage_count = usage_count + 1 WHERE promotion_id = ?', [promotion_id]);
      }
    }

    const shipping_cost = shipping_method === 'fast' ? 50000 : shipping_method === 'express' ? 100000 : 0;
    const total_amount = subtotal + shipping_cost;

    const order_code = `ORD-${Date.now()}-${Math.floor(Math.random() * 99999)}`.toUpperCase();

    // INSERT vào bảng orders (đã có full_name, email, phone_number)
    await conn.query(`
      INSERT INTO orders 
        (user_id, order_code, full_name, shipping_address, email, phone_number,
         shipping_method, shipping_cost, payment_method, store_id,
         total_amount, discount_amount, final_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      user_id || null,
      order_code,
      sanitizeInput(full_name),
      sanitizeInput(address),
      sanitizeInput(guest_email) || null,    // vẫn dùng guest_email từ frontend
      sanitizeInput(guest_phone) || null,    // vẫn dùng guest_phone
      shipping_method,
      shipping_cost,
      payment_method,
      store_id || null,
      subtotal + shipping_cost,   // total_amount (trước giảm giá + phí ship)
      discount_amount,
      total_amount,               // final_amount
    ]);

    const [result] = await conn.query('SELECT LAST_INSERT_ID() as order_id');
    const order_id = result[0].order_id;

    // Thêm chi tiết đơn hàng
    for (const item of cartItems) {
      const price_at_purchase = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      await conn.query(
        'INSERT INTO order_details (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, price_at_purchase]
      );
    }

    // Ghi lại mã giảm giá nếu có
    if (promotion_id && discount_amount > 0) {
      await conn.query(
        'INSERT INTO order_promotions (order_id, promotion_id, applied_discount) VALUES (?, ?, ?)',
        [order_id, promotion_id, discount_amount]
      );
    }

    // Xóa giỏ hàng
    await conn.query(`DELETE FROM carts WHERE ${identifier.field} = ?`, [identifier.value]);

    await conn.query('COMMIT');

    res.json({
      status: 'success',
      order_id,
      order_code,
      total_amount,
      discount_amount
    });

  } catch (error) {
    if (conn) await conn.query('ROLLBACK');
    await logError('createOrder error: ' + error.message);
    console.error('Order Error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Server error' });
  } finally {
    if (conn) conn.release();
  }
};
const getOrderStatus = async (req, res) => {
  const { order_code } = req.query;
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query('SELECT status, updated_at AS last_updated FROM orders WHERE order_code = ?', [order_code]);
    if (!order.length) return res.status(404).json({ status: 'error', message: 'Order not found' });
    res.json({ status: 'success', data: { order_code, current_status: order[0].status, last_updated: order[0].last_updated } });
  } catch (error) {
    await logError('Error fetching status: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

const getOrderInvoice = async (req, res) => {
  const { order_code } = req.query;
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query('SELECT * FROM orders WHERE order_code = ?', [order_code]);
    if (!order.length) return res.status(404).json({ status: 'error', message: 'Order not found' });

    const [details] = await conn.query('SELECT * FROM order_details WHERE order_id = ?', [order[0].order_id]);
    res.json({ status: 'success', data: { ...order[0], details } });
  } catch (error) {
    await logError('Error fetching invoice: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

module.exports = { getCsrfToken, createOrder, getOrderStatus, getOrderInvoice };
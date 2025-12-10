// src/controllers/orderController.js
const db = require('../config/db');
const { sanitizeInput, logError } = require('../config/functions');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Import utils
const { generateInvoicePDFBuffer } = require('../utils/invoiceGenerator');
const { sendInvoiceEmail } = require('../utils/sendInvoiceEmail');

// ============== CSRF TOKEN ==============
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

// ============== TẠO ĐƠN HÀNG + TỰ ĐỘNG GỬI HÓA ĐƠN ==============
const createOrder = async (req, res) => {
  const {
    csrf_token,
    full_name,
    address,
    guest_email,
    guest_phone,
    shipping_method = 'standard',
    payment_method = 'cod',
    store_id,
    promotion_id,
    session_key
  } = req.body;

  const user_id = req.session.user_id;

  // CSRF Protection
  if (csrf_token !== req.session.csrfToken) {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }

  if (!full_name || !address) {
    return res.status(400).json({ status: 'error', message: 'Họ tên và địa chỉ là bắt buộc' });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('START TRANSACTION');

    // Xác định giỏ hàng (đăng nhập hoặc guest)
    const identifier = user_id ? { field: 'user_id', value: user_id } : { field: 'session_key', value: session_key };
    if (!identifier.value) throw new Error('Không tìm thấy giỏ hàng');

    // Lấy sản phẩm trong giỏ
    const [cartItems] = await conn.query(`
      SELECT c.product_id, c.quantity, p.price, p.discount, p.name, p.stock_quantity
      FROM carts c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.${identifier.field} = ?
    `, [identifier.value]);

    if (cartItems.length === 0) throw new Error('Giỏ hàng trống');

    // Tính tiền
    let subtotal = 0;
    const processedItems = cartItems.map(item => {
      const discountedPrice = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      subtotal += discountedPrice * item.quantity;
      return { ...item, price_at_purchase: discountedPrice };
    });

    // Áp dụng mã giảm giá
    let discount_amount = 0;
    if (promotion_id) {
      const [promo] = await conn.query(
        `SELECT discount_percentage, max_usage, usage_count 
         FROM promotions 
         WHERE promotion_id = ? AND status = 'active' AND (end_date IS NULL OR end_date >= NOW())`,
        [promotion_id]
      );
      if (promo.length > 0 && (!promo[0].max_usage || promo[0].usage_count < promo[0].max_usage)) {
        discount_amount = subtotal * (promo[0].discount_percentage / 100);
        subtotal -= discount_amount;
        await conn.query('UPDATE promotions SET usage_count = usage_count + 1 WHERE promotion_id = ?', [promotion_id]);
      }
    }

    // Phí ship
    const shipping_cost = shipping_method === 'fast' ? 50000 : shipping_method === 'express' ? 100000 : 30000;
    const final_amount = subtotal + shipping_cost;

    // Tạo mã đơn hàng
    const order_code = `ORD${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;

    // INSERT đơn hàng
    await conn.query(`
      INSERT INTO orders (
        user_id, order_code, full_name, shipping_address, email, phone_number,
        shipping_method, shipping_cost, payment_method, store_id,
        total_amount, discount_amount, final_amount, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    `, [
      user_id || null,
      order_code,
      sanitizeInput(full_name),
      sanitizeInput(address),
      sanitizeInput(guest_email) || null,
      sanitizeInput(guest_phone) || null,
      shipping_method,
      shipping_cost,
      payment_method,
      store_id || null,
      subtotal + shipping_cost, // total_amount (bao gồm ship, trước giảm giá)
      discount_amount,
      final_amount
    ]);

    const [orderResult] = await conn.query('SELECT LAST_INSERT_ID() as order_id');
    const order_id = orderResult[0].order_id;

    // Thêm chi tiết đơn hàng
    for (const item of processedItems) {
      await conn.query(
        'INSERT INTO order_details (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, item.price_at_purchase]
      );
      // Giảm tồn kho
      await conn.query('UPDATE products SET stock_quantity = stock_quantity - ? WHERE product_id = ?', [item.quantity, item.product_id]);
    }

    // Ghi lại mã giảm giá đã dùng
    if (promotion_id && discount_amount > 0) {
      await conn.query(
        'INSERT INTO order_promotions (order_id, promotion_id, applied_discount) VALUES (?, ?, ?)',
        [order_id, promotion_id, discount_amount]
      );
    }

    // Xóa giỏ hàng
    await conn.query(`DELETE FROM carts WHERE ${identifier.field} = ?`, [identifier.value]);

    await conn.query('COMMIT');

    // ================== TỰ ĐỘNG TẠO & GỬI HÓA ĐƠN ==================
    const fullOrderData = {
      order_id,
      order_code,
      full_name,
      shipping_address: address,
      email: guest_email || null,
      phone_number: guest_phone || null,
      total_amount: subtotal + shipping_cost,
      discount_amount,
      shipping_cost,
      final_amount,
      created_at: new Date(),
      status: 'pending'
    };

(async () => {
  try {
    // LẤY LẠI ĐƠN HÀNG ĐỂ CÓ EMAIL CHÍNH XÁC (từ user hoặc guest)
    const [orderRows] = await conn.query(
      `SELECT o.*, u.email as user_email 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.user_id 
       WHERE o.order_id = ?`,
      [order_id]
    );

    if (!orderRows || orderRows.length === 0) {
      console.error('Không tìm thấy đơn hàng sau khi tạo:', order_id);
      return;
    }

    const currentOrder = orderRows[0];
    const customerEmail = currentOrder.email || currentOrder.user_email;

    // Tạo PDF
    const pdfBuffer = await generateInvoicePDFBuffer({
      ...fullOrderData,
      full_name: currentOrder.full_name,
      shipping_address: currentOrder.shipping_address,
      phone_number: currentOrder.phone_number,
      email: customerEmail,
      order_code: currentOrder.order_code,
      created_at: currentOrder.created_at
    }, processedItems.map(i => ({
      name: i.name,
      quantity: i.quantity,
      price_at_purchase: i.price_at_purchase
    })));

    // Lưu file PDF
    const invoiceDir = path.resolve('./src/uploads/invoices');
    if (!fs.existsSync(invoiceDir)) fs.mkdirSync(invoiceDir, { recursive: true });
    const pdfFilename = `HOADON_${currentOrder.order_code}.pdf`;
    fs.writeFileSync(path.join(invoiceDir, pdfFilename), pdfBuffer);

    // GỬI EMAIL NẾU CÓ EMAIL HỢP LỆ
    if (customerEmail && customerEmail.includes('@') && customerEmail.trim() !== '') {
      await sendInvoiceEmail(customerEmail.trim(), {
        ...currentOrder,
        order_code: currentOrder.order_code,
        final_amount: currentOrder.final_amount,
        created_at: currentOrder.created_at
      }, pdfBuffer);
      
      console.log(`Đã gửi hóa đơn đến: ${customerEmail}`);
    } else {
      console.log(`Không gửi email - Không có email hợp lệ cho đơn ${currentOrder.order_code}`);
    }
  } catch (err) {
    console.error('Lỗi tạo/gửi hóa đơn:', err);
    await logError('Invoice error for order ' + order_code + ': ' + err.message);
  }
})();

    // Trả về ngay cho frontend
    return res.json({
      status: 'success',
      message: 'Đặt hàng thành công! Hóa đơn sẽ được gửi qua email ngay lập tức.',
      order_id,
      order_code,
      final_amount,
      discount_amount
    });

  } catch (error) {
    if (conn) await conn.query('ROLLBACK');
    await logError('createOrder error: ' + error.message);
    console.error('Order Error:', error);
    res.status(500).json({ status: 'error', message: error.message || 'Đã có lỗi xảy ra' });
  } finally {
    if (conn) conn.release();
  }
};

// ============== LẤY TRẠNG THÁI ĐƠN HÀNG ==============
const getOrderStatus = async (req, res) => {
  const { order_code } = req.query;
  if (!order_code) return res.status(400).json({ status: 'error', message: 'Thiếu mã đơn hàng' });

  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query(
      'SELECT status, payment_status, updated_at FROM orders WHERE order_code = ?',
      [order_code]
    );
    conn.release();

    if (!rows.length) return res.status(404).json({ status: 'error', message: 'Không tìm thấy đơn hàng' });

    res.json({
      status: 'success',
      data: {
        order_code,
        status: rows[0].status,
        payment_status: rows[0].payment_status,
        last_updated: rows[0].updated_at
      }
    });
  } catch (error) {
    await logError('getOrderStatus error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ============== LẤY THÔNG TIN HÓA ĐƠN (cho trang xem chi tiết) ==============
const getOrderInvoice = async (req, res) => {
  const { order_code } = req.query;
  if (!order_code) return res.status(400).json({ status: 'error', message: 'Thiếu mã đơn hàng' });

  try {
    const conn = await db.getConnection();

    const [order] = await conn.query('SELECT * FROM orders WHERE order_code = ?', [order_code]);
    if (!order.length) {
      conn.release();
      return res.status(404).json({ status: 'error', message: 'Đơn hàng không tồn tại' });
    }

    const [details] = await conn.query(`
      SELECT od.*, p.name, pi.image_url AS main_image
      FROM order_details od
      JOIN products p ON od.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
      WHERE od.order_id = ?
    `, [order[0].order_id]);

    const [promotions] = await conn.query(`
      SELECT p.*, op.applied_discount
      FROM order_promotions op
      JOIN promotions p ON op.promotion_id = p.promotion_id
      WHERE op.order_id = ?
    `, [order[0].order_id]);

    conn.release();

    res.json({
      status: 'success',
      data: {
        ...order[0],
        details,
        promotions: promotions.length > 0 ? promotions : null
      }
    });
  } catch (error) {
    await logError('getOrderInvoice error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Server error' });
  }
};

// ============== LẤY ĐƠN HÀNG THEO MÃ (dùng cho trang /order/:code) ==============
const getOrderByCode = async (req, res) => {
  const { order_code } = req.params;
  try {
    const conn = await db.getConnection();

    const [order] = await conn.query('SELECT * FROM orders WHERE order_code = ?', [order_code]);
    if (!order.length) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const [details] = await conn.query(`
      SELECT od.*, p.name, pi.image_url AS main_image
      FROM order_details od
      JOIN products p ON od.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
      WHERE od.order_id = ?
    `, [order[0].order_id]);

    const [promotions] = await conn.query(`
      SELECT p.*, op.applied_discount
      FROM order_promotions op
      JOIN promotions p ON op.promotion_id = p.promotion_id
      WHERE op.order_id = ?
    `, [order[0].order_id]);

    conn.release();

    res.json({
      status: 'success',
      order: {
        ...order[0],
        details,
        promotions: promotions.length > 0 ? promotions : null
      }
    });
  } catch (error) {
    await logError('getOrderByCode error: ' + error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCsrfToken,
  createOrder,
  getOrderStatus,
  getOrderInvoice,
  getOrderByCode
};
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

// ============== TẠO ĐƠN HÀNG (ĐÃ HỖ TRỢ NFT) ==============
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
    session_key,
    receive_nft = false // ← Mới: từ checkbox ở Checkout
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
    // Xác định giỏ hàng
    const identifier = user_id ? { field: 'user_id', value: user_id } : { field: 'session_key', value: session_key };
    if (!identifier.value) throw new Error('Không tìm thấy giỏ hàng');
    // Lấy sản phẩm trong giỏ + description + ảnh NFT (nếu có)
    const [cartItems] = await conn.query(`
      SELECT
        c.product_id, c.quantity,
        p.price, p.discount, p.name, p.description,
        COALESCE(p.nft_image_url, pi.image_url) AS nft_image_url
      FROM carts c
      JOIN products p ON c.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
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
    const shipping_cost = shipping_method === 'fast' ? 50000 : shipping_method === 'express' ? 100000 : 30000;
    const final_amount = subtotal + shipping_cost;
    // Tạo mã đơn hàng
    const order_code = `ORD${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`;
    // INSERT đơn hàng (có thêm receive_nft)
    await conn.query(`
      INSERT INTO orders (
        user_id, order_code, full_name, shipping_address, email, phone_number,
        shipping_method, shipping_cost, payment_method, store_id,
        total_amount, discount_amount, final_amount, status, payment_status,
        receive_nft
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?)
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
      subtotal + shipping_cost,
      discount_amount,
      final_amount,
      receive_nft ? 1 : 0
    ]);
    const [orderResult] = await conn.query('SELECT LAST_INSERT_ID() as order_id');
    const order_id = orderResult[0].order_id;
    // Thêm chi tiết đơn hàng + trả về order_detail_id
    const orderDetails = [];
    for (const item of processedItems) {
      const [detailResult] = await conn.query(
        'INSERT INTO order_details (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)',
        [order_id, item.product_id, item.quantity, item.price_at_purchase]
      );
      const order_detail_id = detailResult.insertId;
      orderDetails.push({
        order_detail_id,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
        description: item.description || 'No description',
        image_url: item.nft_image_url || '/placeholder.jpg'
      });
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
    // === TẠO VÀ GỬI HÓA ĐƠN (background) ===
    (async () => {
      try {
        const customerEmail = guest_email || (user_id ? (await conn.query('SELECT email FROM users WHERE user_id = ?', [user_id]))[0][0]?.email : null);
        const currentOrder = (await conn.query('SELECT * FROM orders WHERE order_id = ?', [order_id]))[0][0];
        const pdfBuffer = await generateInvoicePDFBuffer({ ...currentOrder, details: orderDetails });
        const pdfFilename = `HOADON_${currentOrder.order_code}.pdf`;
        fs.writeFileSync(path.join(__dirname, '../../invoices', pdfFilename), pdfBuffer);
        if (customerEmail && customerEmail.includes('@')) {
          await sendInvoiceEmail(customerEmail.trim(), currentOrder, pdfBuffer);
          console.log(`Đã gửi hóa đơn đến: ${customerEmail}`);
        }
      } catch (err) {
        console.error('Lỗi tạo/gửi hóa đơn:', err);
        await logError('Invoice error for order ' + order_code + ': ' + err.message);
      }
    })();
    // Trả về dữ liệu đầy đủ cho frontend (quan trọng: có order_detail_id + receive_nft)
    return res.json({
      status: 'success',
      message: 'Đặt hàng thành công!',
      order_id,
      order_code,
      final_amount,
      discount_amount,
      receive_nft: receive_nft === true || receive_nft === 'true',
      details: orderDetails // ← Cần để mint NFT từng sản phẩm
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

// ============== LƯU NFT MINT SAU KHI MINT THÀNH CÔNG ==============
const saveNFTMint = async (req, res) => {
  const {
    order_id,
    order_detail_id,
    token_id,
    tx_hash,
    mint_address
  } = req.body;
  if (!order_id || !order_detail_id || !token_id || !tx_hash || !mint_address) {
    return res.status(400).json({ status: 'error', message: 'Thiếu thông tin bắt buộc' });
  }
  let conn;
  try {
    conn = await db.getConnection();
    // Kiểm tra đơn hàng tồn tại và thuộc về user (nếu có đăng nhập)
    const [order] = await conn.query('SELECT user_id FROM orders WHERE order_id = ?', [order_id]);
    if (!order.length) return res.status(404).json({ status: 'error', message: 'Đơn hàng không tồn tại' });
    // Kiểm tra chưa mint rồi
    const [existing] = await conn.query('SELECT mint_id FROM order_nft_mints WHERE order_detail_id = ?', [order_detail_id]);
    if (existing.length > 0) {
      return res.status(400).json({ status: 'error', message: 'Sản phẩm này đã được mint NFT rồi' });
    }
    await conn.query(`
      INSERT INTO order_nft_mints
        (order_id, order_detail_id, token_id, tx_hash, mint_address)
      VALUES (?, ?, ?, ?, ?)
    `, [order_id, order_detail_id, token_id, tx_hash, mint_address]);
    res.json({ status: 'success', message: 'NFT đã được lưu thành công!' });
  } catch (error) {
    await logError('saveNFTMint error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Lỗi server' });
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

// ============== LẤY ĐƠN HÀNG THEO MÃ (CÓ NFT INFO) ==============
const getOrderByCode = async (req, res) => {
  const { order_code } = req.params;
  try {
    const conn = await db.getConnection();
    const [order] = await conn.query('SELECT * FROM orders WHERE order_code = ?', [order_code]);
    if (!order.length) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

    const [details] = await conn.query(`
      SELECT
        od.*, p.name, p.description,
        pi.image_url AS main_image,
        nft.token_id, nft.tx_hash, nft.minted_at
      FROM order_details od
      JOIN products p ON od.product_id = p.product_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id AND pi.is_main = 1
      LEFT JOIN order_nft_mints nft ON od.detail_id = nft.order_detail_id  -- Sửa: od.detail_id thay vì od.order_detail_id
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
        receive_nft: !!order[0].receive_nft,
        details,
        promotions: promotions.length > 0 ? promotions : null
      }
    });
  } catch (error) {
    await logError('getOrderByCode error: ' + error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ============== LẤY DANH SÁCH ĐƠN HÀNG CHO ADMIN ==============
const getOrdersMana = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const { search = '', status = '' } = req.query;
    let query = `
      SELECT o.order_id, o.order_code, o.total_amount, o.status, o.created_at, u.full_name, u.email
      FROM orders o JOIN users u ON o.user_id = u.user_id
      WHERE 1=1
    `;
    const params = [];
    if (search) {
      query += ' AND (o.order_code LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }
    query += ' ORDER BY o.created_at DESC';

    const [rows] = await conn.query(query, params);
    res.json({ status: 'success', data: rows });
  } catch (error) {
    await logError('getOrdersMana error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch orders' });
  } finally {
    if (conn) conn.release();
  }
};

// ============== CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG CHO ADMIN ==============
const updateOrderStatus = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [userRows] = await conn.query('SELECT role FROM users WHERE user_id = ?', [req.session.user_id]);
    const user = userRows[0];
    if (!user || user.role !== 'admin') return res.status(403).json({ status: 'error', message: 'Not admin' });

    const { order_id, status } = req.body;
    if (!order_id || !status) return res.status(400).json({ status: 'error', message: 'Missing required fields' });

    const [result] = await conn.query('UPDATE orders SET status = ? WHERE order_id = ?', [status, order_id]);
    if (result.affectedRows > 0) {
      res.json({ status: 'success', message: 'Order status updated' });
    } else {
      res.status(404).json({ status: 'error', message: 'Order not found' });
    }
  } catch (error) {
    await logError('updateOrderStatus error: ' + error.message);
    res.status(500).json({ status: 'error', message: 'Failed to update order status' });
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  getCsrfToken,
  createOrder,
  saveNFTMint,
  getOrderStatus,
  getOrderInvoice,
  getOrderByCode,
  getOrdersMana,
  updateOrderStatus
};
// src/utils/sendInvoiceEmail.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

export const sendInvoiceEmail = async (order, orderDetails, pdfBuffer) => {
  try {
    // FIX: Đúng là createTransport (không có 'er')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,  // ← PHẢI là App Password 16 ký tự từ Google!
      },
    });

    // Email người nhận (ưu tiên order.email → fallback về email test)
    const toEmail = order.email && order.email.includes('@') 
      ? order.email.trim() 
      : 'nguyenvietan891@gmail.com';

    const mailOptions = {
      from: `"SC Model Shop" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `Hóa đơn điện tử - Đơn hàng ${order.order_code} - SC Model Shop`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #d4380d; text-align: center;">CẢM ƠN BẠN ĐÃ MUA SẮM TẠI SC MODEL SHOP!</h2>
          <p>Xin chào <strong>${order.full_name || 'Quý khách'}</strong>,</p>
          <p>Đơn hàng của bạn đã được tiếp nhận thành công.</p>
          
          <div style="background:#f9f9f9; padding:15px; border-radius:8px; margin:20px 0;">
            <p><strong>Mã đơn hàng:</strong> <span style="font-size:18px; color:#d4380d;">${order.order_code}</span></p>
            <p><strong>Tổng thanh toán:</strong> 
              <span style="font-size:20px; color:#d4380d; font-weight:bold;">
                ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.final_amount || 0)}
              </span>
            </p>
            <p><strong>Ngày đặt:</strong> ${new Date(order.created_at || Date.now()).toLocaleString('vi-VN')}</p>
          </div>

          <p>Chi tiết hóa đơn đã được đính kèm trong email này (file PDF).</p>
          <p>Chúng tôi sẽ sớm xử lý và giao hàng đến bạn trong thời gian sớm nhất!</p>
          
          <hr style="margin:30px 0; border:0; border-top:1px solid #eee;">
          <p style="color:#666; font-size:14px;">
            Trân trọng,<br>
            <strong>Đội ngũ SC Model Shop</strong><br>
            Website: <a href="https://scmodel.vn">scmodel.vn</a>
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `HOADON_${order.order_code}.pdf`,
          content: pdfBuffer,                    
          contentType: 'application/pdf'
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Gửi hóa đơn thành công tới:', toEmail);
    console.log('📧 MessageId:', info.messageId);
    return true;

  } catch (error) {
    console.error('❌ LỖI GỬI EMAIL HÓA ĐƠN:', error.message);
    if (error.response) console.error('📄 Response error:', error.response);
    return false;
  }
};
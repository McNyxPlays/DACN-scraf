// src/utils/sendInvoiceEmail.js  ← THAY TOÀN BỘ FILE NÀY
const nodemailer = require('nodemailer');

async function sendInvoiceEmail(toEmail, order, pdfBuffer) {
  if (!toEmail || !toEmail.includes('@')) return;

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: '....m',           // ← Email của bạn
      pass: '....'            // ← App Password 16 ký tự (có dấu cách)
    }
  });

  await transporter.sendMail({
    from: 'SC Model Shop <anhhoa090@gmail.com>',
    to: toEmail,
    subject: `Hóa đơn #${order.order_code} - SC Model Shop`,
    html: `
      <h3>Xin chào ${order.full_name || 'quý khách'},</h3>
      <p>Cảm ơn bạn đã mua hàng!</p>
      <p>Đính kèm hóa đơn điện tử của đơn hàng <strong>#${order.order_code}</strong></p>
      <p>Trân trọng,<br/>SC Model Shop</p>
    `,
    attachments: [{
      filename: `HOADON_${order.order_code}.pdf`,
      content: pdfBuffer
    }]
  });

  console.log('Đã gửi hóa đơn qua Gmail SMTP đến:', toEmail);
}

module.exports = { sendInvoiceEmail };

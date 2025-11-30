// src/utils/invoiceGenerator.js
const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const QRCode = require('qrcode');

const __dirname = path.dirname(__filename);

// Load font
const robotoRegular = fs.readFileSync(path.resolve(__dirname, '../../public/fonts/Roboto-Regular.ttf'));
const robotoBold = fs.readFileSync(path.resolve(__dirname, '../../public/fonts/Roboto-Bold.ttf'));

const toBase64 = (buffer) => buffer.toString('base64');

const formatCurrency = (amount) => {
  if (!amount) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const generateInvoicePDFBuffer = async (order, orderDetails = []) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  doc.addFileToVFS('Roboto-Regular.ttf', toBase64(robotoRegular));
  doc.addFileToVFS('Roboto-Bold.ttf', toBase64(robotoBold));
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
  doc.setFont('Roboto');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const qrData = `https://scmodel.vn/order/${order.order_code}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 512, margin: 1 });

  // Viền + Logo
  doc.setDrawColor(0);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  try {
    const logoPath = path.resolve(__dirname, '../../public/images/logo.png');
    if (fs.existsSync(logoPath)) {
      const logoBase64 = fs.readFileSync(logoPath).toString('base64');
      doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 14, 12, 34, 34);
    }
  } catch (e) {}

  // Header
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.text('SC MODEL SHOP', 54, 22);
  doc.setFontSize(10);
  doc.setFont('Roboto', 'normal');
  doc.setTextColor(80);
  doc.text('Địa chỉ: 123 Đường ABC, TP. Hồ Chí Minh', 54, 30);
  doc.text('Hotline: 090xxxxxxx | Email: contact@scmodel.vn', 54, 36);
  doc.text('Website: scmodel.vn | MST: 0123456789', 54, 42);

  doc.setFontSize(22);
  doc.setFont('Roboto', 'bold');
  doc.setTextColor(0);
  doc.text('HÓA ĐƠN MUA HÀNG', pageWidth / 2, 65, { align: 'center' });

  // Thông tin khách
  let y = 85;
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(11);
  doc.text('Họ tên người mua hàng:', 15, y);
  doc.text('Địa chỉ:', 15, y + 8);
  doc.text('Điện thoại:', 15, y + 16);
  doc.text('Mã đơn hàng:', 15, y + 24);
  doc.text('Ngày đặt hàng:', 15, y + 32);

  doc.setFont('Roboto', 'normal');
  doc.text(order.full_name || 'Khách lẻ', 68, y);
  doc.text(order.shipping_address || 'Không có', 68, y + 8, { maxWidth: 125 });
  doc.text(order.phone_number || 'N/A', 68, y + 16);
  doc.text(order.order_code || 'N/A', 68, y + 24);
  doc.text(new Date(order.created_at || Date.now()).toLocaleDateString('vi-VN'), 68, y + 32);

  // Bảng sản phẩm – ĐÃ FIX WIDTH + WRAP TEXT + LẤY finalY ĐÚNG
  const rows = orderDetails.map((item, i) => [
    (i + 1).toString(),
    item.product_name || item.name || 'Sản phẩm',
    item.quantity.toString(),
    formatCurrency(item.price_at_purchase),
    formatCurrency(item.price_at_purchase * item.quantity),
  ]);

  autoTable(doc, {
    startY: y + 45,
    head: [['STT', 'Tên hàng hóa', 'SL', 'Đơn giá', 'Thành tiền']],
    body: rows,
    theme: 'grid',
    headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: 'bold', fontSize: 11 },
    styles: { 
      font: 'Roboto', 
      fontSize: 9,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'left',
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 68 },  // ← Giảm để fit
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 35, halign: 'right' },
      4: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 10, right: 10 }
  });

  // ← FIX: LẤY finalY ĐÚNG SAU KHI DÙNG autoTable(doc, ...)
  const finalY = doc.lastAutoTable.finalY + 15;

  // Tính tiền
  const totalAmount = order.final_amount || order.total_amount || 0;
  const discount = order.discount_amount || 0;
  const shipping = order.shipping_cost || 0;
  const subtotal = totalAmount - shipping + discount;

  const f = (amount) => `₫${Math.round(amount).toLocaleString('vi-VN')}`;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(12);
  doc.text('Cộng tiền hàng:', 115, finalY);
  doc.text(f(subtotal), 195, finalY, { align: 'right' });

  doc.text('Phí vận chuyển:', 115, finalY + 10);
  doc.text(shipping === 0 ? 'Miễn phí' : f(shipping), 195, finalY + 10, { align: 'right' });

  if (discount > 0) {
    doc.text('Giảm giá:', 115, finalY + 20);
    doc.text(`-${f(discount)}`, 195, finalY + 20, { align: 'right' });
  }

  doc.setLineWidth(0.5);
  doc.rect(110, finalY + 35, 85, 12);
  doc.setFontSize(18);
  doc.text('Tổng cộng:', 115, finalY + 43);
  doc.text(f(totalAmount), 190, finalY + 43, { align: 'right' });

  // QR Code + Footer
  doc.addImage(qrCodeDataUrl, 'PNG', 15, finalY + 50, 28, 28);
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text('QR CODE', 29, finalY + 68, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Xin chân thành cảm ơn Quý khách!', pageWidth / 2, pageHeight - 22, { align: 'center' });
  doc.text('Hóa đơn được xuất tự động từ hệ thống SC Model Shop', pageWidth / 2, pageHeight - 16, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
};

module.exports = { generateInvoicePDFBuffer, formatCurrency };
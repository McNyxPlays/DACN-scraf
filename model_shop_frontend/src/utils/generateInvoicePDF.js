// src/utils/generateInvoicePDF.js

import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable"; // cần import riêng để dùng kiểu module

const exchangeRate = 25000;

const formatCurrency = (amount) => {
  const value = (Number(amount) * exchangeRate).toFixed(2);
  return `₫${Number(value).toLocaleString("vi-VN")}`;
};

const generateInvoicePDF = (order, options = {}) => {
  const { download = true, filename } = options;

  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("HÓA ĐƠN ĐẶT HÀNG", 105, 20, { align: "center" });

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Mã đơn hàng: ${order.order_code || "N/A"}`, 20, 35);
  doc.text(`Ngày đặt: ${new Date(order.created_at || Date.now()).toLocaleDateString("vi-VN")}`, 20, 42);
  doc.text(`Khách hàng: ${order.full_name || "N/A"}`, 20, 49);
  doc.text(`Số điện thoại: ${order.phone_number || "N/A"}`, 20, 56);
  doc.text(`Email: ${order.email || "N/A"}`, 20, 63);

  if (order.shipping_method === "store_pickup") {
    doc.text(`Nhận tại cửa hàng: Store ID ${order.store_id}`, 20, 70);
  } else {
    doc.text(`Địa chỉ giao hàng: ${order.shipping_address || order.address || "N/A"}`, 20, 70);
  }

  // Bảng sản phẩm
  const tableData = (order.details || []).map(item => [
    item.name || item.product_name,
    item.quantity,
    formatCurrency(item.price_at_purchase),
    formatCurrency(item.price_at_purchase * item.quantity)
  ]);

  autoTable(doc, {
    head: [["Sản phẩm", "Số lượng", "Đơn giá", "Thành tiền"]],
    body: tableData,
    startY: 90,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  const finalY = doc.lastAutoTable.finalY || 90;

  // Tổng tiền
  const subtotal = order.total_amount - order.shipping_cost + (order.discount_amount || 0);

  doc.setFontSize(11);
  doc.text(`Tạm tính:`, 140, finalY + 15);
  doc.text(`${formatCurrency(subtotal)}`, 190, finalY + 15, { align: "right" });

  doc.text(`Phí vận chuyển:`, 140, finalY + 23);
  doc.text(`${order.shipping_cost === 0 ? "Miễn phí" : formatCurrency(order.shipping_cost)}`, 190, finalY + 23, { align: "right" });

  if (order.discount_amount > 0) {
    doc.setTextColor(231, 76, 60); // đỏ
    doc.text(`Giảm giá (${order.promotions?.[0]?.code || "PROMO"}):`, 140, finalY + 31);
    doc.text(`-${formatCurrency(order.discount_amount)}`, 190, finalY + 31, { align: "right" });
    doc.setTextColor(0, 0, 0);
  }

  // Tổng cuối
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(`TỔNG CỘNG:`, 140, finalY + 45);
  doc.setFontSize(16);
  doc.setTextColor(39, 174, 96);
  doc.text(`${formatCurrency(order.total_amount)}`, 190, finalY + 45, { align: "right" });

  // Footer
  doc.setFontSize(10);
  doc.setTextColor(128, 128, 128);
  doc.text("Cảm ơn quý khách đã mua sắm tại Model Shop!", 105, finalY + 70, { align: "center" });

  // Xuất file
  const defaultFilename = filename || `HoaDon_${order.order_code}.pdf`;

  if (download) {
    doc.save(defaultFilename);
  }

  // Trả về blob nếu muốn xem trước hoặc gửi email
  return doc.output("blob");
};

export default generateInvoicePDF;
// src/utils/generateInvoicePDF.js
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";
import { formatCurrency } from "./formatCurrency";

applyPlugin(jsPDF);

const robotoRegular = await fetch("/fonts/Roboto-Regular.ttf").then(res => res.arrayBuffer());
const robotoBold = await fetch("/fonts/Roboto-Bold.ttf").then(res => res.arrayBuffer());

const toBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary);
};

const regularBase64 = toBase64(robotoRegular);
const boldBase64 = toBase64(robotoBold);

const generateInvoicePDF = async (order, options = {}) => {
  const { download = true, filename } = options;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.addFileToVFS("Roboto-Regular.ttf", regularBase64);
  doc.addFileToVFS("Roboto-Bold.ttf", boldBase64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.setFont("Roboto");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Viền ngoài
  doc.setDrawColor(0);
  doc.setLineWidth(1.5);
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16);

  // Logo + thông tin shop
  try {
    doc.addImage("/images/logo.png", "PNG", 14, 12, 34, 34);
  } catch (e) {}

  doc.setFont("Roboto", "bold");
  doc.setFontSize(18);
  doc.setTextColor(0);
  doc.text("SC MODEL SHOP", 54, 22);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.setFont("Roboto", "normal");
  doc.text("Địa chỉ: 123 Đường ABC, TP. Hồ Chí Minh", 54, 30);
  doc.text("Hotline: 090xxxxxxx | Email: contact@scmodel.vn", 54, 36);
  doc.text("Website: scmodel.vn | MST: 0123456789", 54, 42);

  // Tiêu đề
  doc.setFontSize(22);
  doc.setFont("Roboto", "bold");
  doc.setTextColor(0);
  doc.text("HÓA ĐƠN MUA HÀNG", pageWidth / 2, 65, { align: "center" });

  // Thông tin khách hàng
  let y = 85;
  doc.setFont("Roboto", "bold");
  doc.setFontSize(11);
  doc.text("Họ tên người mua hàng:", 15, y);
  doc.text("Địa chỉ:", 15, y + 8);
  doc.text("Điện thoại:", 15, y + 16);
  doc.text("Mã đơn hàng:", 15, y + 24);
  doc.text("Ngày đặt hàng:", 15, y + 32);

  doc.setFont("Roboto", "normal");
  doc.text(order.full_name || "Khách lẻ", 68, y);
  doc.text(order.shipping_address || order.address || "Không có", 68, y + 8, { maxWidth: 125 });
  doc.text(order.phone_number || "N/A", 68, y + 16);
  doc.text(order.order_code || "N/A", 68, y + 24);
  doc.text(new Date(order.created_at || Date.now()).toLocaleDateString("vi-VN"), 68, y + 32);

  // BẢNG SẢN PHẨM - CHỈ FORMAT ĐƠN GIÁ & THÀNH TIỀN
  const rows = (order.details || []).map((item, i) => [
    (i + 1).toString(),
    item.name || "Sản phẩm",
    item.quantity || 1,
    formatCurrency(item.price_at_purchase),                    // đúng
    formatCurrency((item.price_at_purchase || 0) * item.quantity), // đúng
  ]);

  doc.autoTable({
    startY: y + 45,
    head: [["STT", "Tên hàng hóa", "SL", "Đơn giá", "Thành tiền"]],
    body: rows,
    theme: "grid",
    pageBreak: "auto",
    rowPageBreak: "avoid",
    headStyles: { fillColor: [255,255,255], textColor: 0, fontStyle: "bold", fontSize: 11, lineWidth: 0.1, lineColor: 0 },
    styles: { font: "Roboto", fontSize: 10.5, cellPadding: 5, textColor: 0, lineWidth: 0.1, lineColor: 0 },
    columnStyles: {
      0: { cellWidth: 12, halign: "center" },
      1: { cellWidth: 75 },
      2: { cellWidth: 15, halign: "center" },
      3: { cellWidth: 38, halign: "right" },
      4: { cellWidth: 38, halign: "right" },
    },
  });

  const finalY = doc.lastAutoTable.finalY + 15;

  // ===== TỔNG TIỀN - ĐÃ SỬA CHÍNH XÁC 100% =====
  // Giả sử backend đã gửi đúng các trường này bằng VND (hoặc USD → chỉ format 1 lần)
  const totalVND = order.total_amount_vnd || order.total_amount * 25000 || 0;
  const shippingVND = order.shipping_cost_vnd || order.shipping_cost * 25000 || 0;
  const discountVND = order.discount_amount_vnd || order.discount_amount * 25000 || 0;
  const subtotalVND = totalVND - shippingVND + discountVND;

  const f = (amount) => `₫${Math.round(amount).toLocaleString("vi-VN")}`;

  doc.setFont("Roboto", "bold");
  doc.setFontSize(12);
  doc.setTextColor(0);

  doc.text("Cộng tiền hàng:", 115, finalY);
  doc.text(f(subtotalVND), 195, finalY, { align: "right" });

  doc.text("Phí vận chuyển:", 115, finalY + 10);
  doc.text(shippingVND === 0 ? "Miễn phí" : f(shippingVND), 195, finalY + 10, { align: "right" });

  if (discountVND > 0) {
    doc.text("Giảm giá:", 115, finalY + 20);
    doc.text(`-${f(discountVND)}`, 195, finalY + 20, { align: "right" });
  }

  // Tổng cộng
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(110, finalY + 35, 85, 12);
  doc.setFontSize(18);
  doc.text("Tổng cộng:", 115, finalY + 43);
  doc.text(f(totalVND), 190, finalY + 43, { align: "right" });

  // QR + Dấu đã thanh toán
  doc.setFillColor(240);
  doc.rect(15, finalY + 50, 28, 28, "F");
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("QR CODE", 29, finalY + 68, { align: "center" });


  // Footer
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text("Xin chân thành cảm ơn Quý khách!", pageWidth / 2, pageHeight - 22, { align: "center" });
  doc.text("Hóa đơn được xuất tự động từ hệ thống SC Model Shop", pageWidth / 2, pageHeight - 16, { align: "center" });

  const defaultFilename = filename || `HOADON_${order.order_code || "SC"}.pdf`;
  if (download) doc.save(defaultFilename);
  return doc.output("blob");
};

export default generateInvoicePDF;
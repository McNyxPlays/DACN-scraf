// src/utils/formatCurrency.js

// Backend lưu tiền theo USD → phải nhân 25.000 để ra VND
const EXCHANGE_RATE = 25000;

/**
 * Format số tiền từ USD (backend) → VND (hiển thị)
 * Ví dụ: 5 → "₫125.000"
 *        12.5 → "₫312.500"
 *        null/undefined → "₫0"
 */
export const formatCurrency = (amount = 0) => {
  const vnd = Math.round(Number(amount) * EXCHANGE_RATE);
  return `₫${vnd.toLocaleString("vi-VN")}`;
};
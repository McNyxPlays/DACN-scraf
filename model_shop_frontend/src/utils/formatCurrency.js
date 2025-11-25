// src/utils/formatCurrency.js
export const formatCurrency = (amount) => {
  return `₫${Math.round(Number(amount)).toLocaleString("vi-VN")}`;
};
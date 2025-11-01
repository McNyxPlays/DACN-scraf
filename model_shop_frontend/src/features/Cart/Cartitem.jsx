// src/features/Cart/CartItem.jsx
import React from "react";

function CartItem({ item, user, exchangeRate, onQuantityChange, onRemove }) {
  const itemId = user ? item.cart_id : item.guest_cart_id;

  // Đảm bảo các giá trị là số hợp lệ
  const price =
    typeof item.price === "number" && !isNaN(item.price) ? item.price : 0;
  const rate =
    typeof exchangeRate === "number" && !isNaN(exchangeRate) ? exchangeRate : 1;
  const quantity =
    typeof item.quantity === "number" && !isNaN(item.quantity)
      ? item.quantity
      : 1;

  // GIÁ HIỂN THỊ: price × rate × quantity
  const itemPrice = price * rate * quantity;

  const handleIncrement = () => onQuantityChange(itemId, 1);
  const handleDecrement = () => onQuantityChange(itemId, -1);

  return (
    <div className="flex items-center gap-2 border-b pb-2">
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        <p className="text-sm text-gray-500">
          {item.description || "No description available"}
        </p>
        <p className="text-lg font-medium">
          {itemPrice > 0 ? itemPrice.toLocaleString("vi-VN") : "0"} VND
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleDecrement}
          className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
          disabled={quantity <= 1}
        >
          -
        </button>
        <span className="w-6 text-center text-sm">{quantity}</span>
        <button
          onClick={handleIncrement}
          className="w-6 h-6 bg-gray-200 rounded hover:bg-gray-300 transition text-sm"
        >
          +
        </button>
      </div>
      <button
        onClick={() => onRemove(itemId)}
        className="text-red-500 hover:text-red-600 ml-2"
      >
        <i className="ri-delete-bin-line"></i>
      </button>
    </div>
  );
}

export default CartItem;
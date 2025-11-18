// src/features/Cart/CartItem.jsx
import React from "react";
import ImageWithFallback from "../../components/ImageWithFallback";

function CartItem({ item, exchangeRate, onQuantityChange, onRemove }) {
  const finalPrice = item.discount > 0
    ? item.price * (1 - item.discount / 100)
    * exchangeRate
    : item.price * exchangeRate;

  const displayPrice = Math.round(finalPrice) * item.quantity;

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200 last:border-0">
      <div className="w-20 h-20 flex-shrink-0">
        <ImageWithFallback
          src={`/Uploads/products/${item.main_image || 'placeholder.jpg'}`}
          alt={item.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900 line-clamp-2">{item.name}</h3>
        
        {item.discount > 0 && (
          <p className="text-sm text-gray-500 line-through">
            {(item.price * exchangeRate).toLocaleString("vi-VN")} VND
          </p>
        )}
        
        <p className="text-lg font-bold text-primary">
          {displayPrice.toLocaleString("vi-VN")} VND
        </p>
      </div>

      <div className="flex flex-col items-end gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onQuantityChange(item.cart_id || item.guest_cart_id, item.quantity - 1)}
            className="w-8 h-8 rounded border hover:bg-gray-100 disabled:opacity-50"
            disabled={item.quantity <= 1}
          >−</button>
          <span className="w-10 text-center font-medium">{item.quantity}</span>
          <button
            onClick={() => onQuantityChange(item.cart_id || item.guest_cart_id, item.quantity + 1)}
            className="w-8 h-8 rounded border hover:bg-gray-100"
          >+</button>
        </div>

        <button
          onClick={() => onRemove(item.cart_id || item.guest_cart_id)}
          className="text-red-500 text-sm hover:text-red-700"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

export default CartItem;
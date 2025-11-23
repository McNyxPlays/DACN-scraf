// src/features/Cart/CartItem.jsx
import React from "react";
import ImageWithFallback from "../../components/ImageWithFallback";
import api from "../../api/index";
import { useSelector } from "react-redux";
import { useSession } from "../../context/SessionContext";
import { Toastify } from "../../components/Toastify";

function CartItem({ item, exchangeRate, onUpdate }) {
  const user = useSelector((state) => state.user.user);
  const { sessionKey } = useSession();

  const priceAfterDiscount = item.discount > 0
    ? item.price * (1 - item.discount / 100)
    : item.price;

  const displayPrice = priceAfterDiscount * exchangeRate; // Giá cố định mỗi sản phẩm

  const handleQuantityChange = async (newQty) => {
    if (newQty < 1) return;

    try {
      const data = { cart_id: item.cart_id, quantity: newQty };
      if (!user?.user_id) data.session_key = sessionKey;

      await api.put("/cart", data);
      onUpdate?.();
      // Không hiện Toast "Cart updated!" nữa → UX sạch hơn
    } catch (err) {
      Toastify.error("Cập nhật số lượng thất bại");
    }
  };

  const handleRemove = async () => {
    if (!confirm("Xóa sản phẩm này khỏi giỏ hàng?")) return;

    try {
      const data = { cart_id: item.cart_id };
      if (!user?.user_id) data.session_key = sessionKey;

      await api.delete("/cart", { data });
      onUpdate?.();
      Toastify.success("Đã xóa sản phẩm");
    } catch (err) {
      Toastify.error("Xóa thất bại");
    }
  };

  return (
    <div className="flex gap-4 py-5 border-b border-gray-100 last:border-0">
      <div className="w-20 h-20 flex-shrink-0">
        <ImageWithFallback
          src={`/Uploads/products/${item.main_image || 'placeholder.jpg'}`}
          alt={item.name}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900 line-clamp-2 text-sm">
          {item.name}
        </h3>

        {/* Giá cố định (không nhân quantity) */}
        <div className="mt-1">
          {item.discount > 0 && (
            <p className="text-xs text-gray-500 line-through">
              {(item.price * exchangeRate).toLocaleString("vi-VN")} ₫
            </p>
          )}
          <p className="font-bold text-primary">
            {Math.round(displayPrice).toLocaleString("vi-VN")} ₫
          </p>
        </div>

        <p className="text-xs text-gray-500 mt-1">
          {item.quantity} × sản phẩm
        </p>
      </div>

      <div className="flex flex-col justify-between items-end">
        {/* Nút + - */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-full">
          <button
            onClick={() => handleQuantityChange(item.quantity - 1)}
            className="w-8 h-8 text-gray-600 hover:bg-gray-200 rounded-full transition"
            disabled={item.quantity <= 1}
          >
            −
          </button>
          <span className="w-10 text-center font-medium text-sm">
            {item.quantity}
          </span>
          <button
            onClick={() => handleQuantityChange(item.quantity + 1)}
            className="w-8 h-8 text-gray-600 hover:bg-gray-200 rounded-full transition"
          >
            +
          </button>
        </div>

        {/* Nút xóa */}
        <button
          onClick={handleRemove}
          className="text-xs text-red-600 hover:text-red-700 mt-3"
        >
          Xóa
        </button>
      </div>
    </div>
  );
}

export default CartItem;
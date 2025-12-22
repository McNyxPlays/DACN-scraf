// src/features/Cart/CartItem.jsx
// Component hiển thị từng item trong giỏ hàng, hỗ trợ toggle "Receive as NFT" per item
import React from "react";
import ImageWithFallback from "../../components/ImageWithFallback";
import api from "../../api/index";
import { useSelector } from "react-redux";
import { useSession } from "../../context/SessionContext";
import { Toastify } from "../../components/Toastify";
import Swal from "sweetalert2";

function CartItem({ item, exchangeRate, onUpdate }) {
  const user = useSelector((state) => state.user.user);
  const { sessionKey } = useSession();

  const priceAfterDiscount = item.discount > 0
    ? item.price * (1 - item.discount / 100)
    : item.price;

  const displayPrice = priceAfterDiscount * exchangeRate;

  // Cập nhật số lượng
  const handleQuantityChange = async (newQty) => {
    if (newQty < 1) return;

    try {
      const data = { cart_id: item.cart_id, quantity: newQty };
      if (!user?.user_id) data.session_key = sessionKey;

      await api.put("/cart", data);
      onUpdate?.();
    } catch (err) {
      Toastify.error("Update quantity failed");
    }
  };

  // Toggle lựa chọn nhận NFT
  const handleToggleNFT = async () => {
    const newReceiveNFT = item.receive_nft ? 0 : 1;

    try {
      const data = { cart_id: item.cart_id, receive_nft: newReceiveNFT };
      if (!user?.user_id) data.session_key = sessionKey;

      await api.put("/cart", data);
      onUpdate?.();
      Toastify.success(newReceiveNFT ? "Will receive as NFT" : "NFT option removed");
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Failed to update NFT option");
    }
  };

  // Xóa item với confirm SweetAlert2
  const handleRemove = async () => {
    const result = await Swal.fire({
      title: "Remove Item",
      text: "Are you sure you want to remove this product from the cart?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, remove it!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        const data = { cart_id: item.cart_id };
        if (!user?.user_id) data.session_key = sessionKey;

        await api.delete("/cart", { data });
        onUpdate?.();
        Toastify.success("Product removed");
      } catch (err) {
        Toastify.error("Remove failed");
      }
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
          {item.quantity} × product
        </p>

        {/* Checkbox Receive as NFT - chỉ hiển thị nếu sản phẩm hỗ trợ */}
        {item.is_nft_eligible === 1 && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id={`nft-${item.cart_id}`}
              checked={!!item.receive_nft}
              onChange={handleToggleNFT}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label
              htmlFor={`nft-${item.cart_id}`}
              className="text-sm text-gray-700 cursor-pointer select-none"
            >
              Receive as NFT
            </label>
          </div>
        )}
      </div>

      <div className="flex flex-col justify-between items-end">
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

        <button
          onClick={handleRemove}
          className="text-xs text-red-600 hover:text-red-700 mt-3"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

export default CartItem;
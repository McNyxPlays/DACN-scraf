// src/features/Cart/Cart.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import CartItem from "./CartItem";
import { useSession } from "../../context/SessionContext";
import { EXCHANGE_RATE } from "../../utils/constants";
function Cart({ isOpen, setIsOpen }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const user = useSelector((state) => state.user.user);
  const navigate = useNavigate();
  const cartRef = useRef(null);
  const { sessionKey } = useSession();

  const fetchCartItems = async () => {
    setLoading(true);
    try {
      const response = user?.user_id
        ? await api.get("/cart")
        : await api.get("/cart", { params: { session_key: sessionKey } });

      setCartItems(response.data.items || []);
      setError("");
    } catch (err) {
      setError("Failed to load cart");
      console.error("Cart fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load khi mở cart
  useEffect(() => {
    if (isOpen) fetchCartItems();
  }, [isOpen, user?.user_id, sessionKey]);

  // Cập nhật khi có thay đổi (add, update, delete)
  useEffect(() => {
    const handler = () => isOpen && fetchCartItems();
    window.addEventListener("cartUpdated", handler);
    return () => window.removeEventListener("cartUpdated", handler);
  }, [isOpen]);

  // XÓA TẤT CẢ
  const handleClearCart = async () => {
    if (!confirm("Clear all items in the cart?")) return;

    try {
      const payload = user?.user_id ? {} : { session_key: sessionKey };
      await api.delete("/cart", { data: payload });
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      Toastify.success("Đã xóa toàn bộ giỏ hàng");
    } catch (err) {
      Toastify.error("Xóa giỏ hàng thất bại");
    }
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
    return sum + price * item.quantity;
  }, 0) * EXCHANGE_RATE;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div ref={cartRef} className="bg-white w-full max-w-md h-full overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-6 border-b sticky top-0 bg-white z-10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Cart ({cartItems.length})</h2>
          <button onClick={() => setIsOpen(false)} className="text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">Loading...</div>
          ) : error ? (
            <p className="text-red-500 text-center">{error}</p>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <i className="ri-shopping-cart-2-line text-6xl mb-4 block"></i>
              <p>Your cart is empty</p>
            </div>
          ) : (
            <>
              {/* Nút XÓA TẤT CẢ */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleClearCart}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-5">
                {cartItems.map((item) => (
                  <CartItem
                    key={item.cart_id}
                    item={item}
                    exchangeRate={EXCHANGE_RATE}
                    onUpdate={() => window.dispatchEvent(new CustomEvent("cartUpdated"))}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer - Tổng tiền + Checkout */}
        {cartItems.length > 0 && (
          <div className="border-t bg-white p-6">
            <div className="flex justify-between text-xl font-bold mb-5">
              <span>Subtotal</span>
              <span className="text-primary">
                {Math.round(subtotal).toLocaleString("vi-VN")} ₫
              </span>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleCheckout}
                className="w-full bg-primary text-white py-3.5 rounded-lg font-medium hover:bg-primary/90 transition"
              >
                Checkout
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-full border border-gray-300 py-3.5 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Continue shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
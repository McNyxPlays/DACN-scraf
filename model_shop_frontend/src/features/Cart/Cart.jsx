// src/features/Cart/Cart.jsx
// Component giỏ hàng, hỗ trợ toggle receive_nft per item
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import CartItem from "./CartItem";
import { useSession } from "../../context/SessionContext";
import { EXCHANGE_RATE } from "../../utils/constants";
import Swal from "sweetalert2";

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

      setCartItems(response.data.data || []);  // SỬA: backend trả 'data' thay vì 'items'
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
    const result = await Swal.fire({
      title: "Clear Cart",
      text: "Are you sure you want to clear all items in the cart?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, clear all!",
    });

    if (result.isConfirmed) {
      try {
        const data = user?.user_id ? {} : { session_key: sessionKey };
        await api.delete("/cart", { data });
        setCartItems([]);
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        Toastify({ type: "success", message: "Cart cleared" });
      } catch (err) {
        Toastify({ type: "error", message: "Failed to clear cart" });
      }
    }
  };

  // Checkout – CHO PHÉP GUEST CHECKOUT (không bắt login)
  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  // Tổng tiền
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity * EXCHANGE_RATE,
    0
  );

  // Đóng cart khi click ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <div
      className={`fixed inset-0 z-50 overflow-hidden transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Cart Modal */}
      <div
        ref={cartRef}
        className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } flex flex-col`}
      >
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold">Your Cart</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
            <i className="ri-close-line ri-xl"></i>
          </button>
        </div>

        {/* Body - Danh sách items */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-600">{error}</div>
          ) : cartItems.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
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
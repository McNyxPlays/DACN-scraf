// src/features/Cart/Cart.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify"; // ← Added import for Toastify
import CartItem from "./CartItem";

function Cart({ isOpen, setIsOpen }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const exchangeRate = 25000;
  const user = JSON.parse(localStorage.getItem("user"));
  const sessionKey =
    localStorage.getItem("guest_session_key") ||
    (() => {
      const newSessionKey = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guest_session_key", newSessionKey);
      return newSessionKey;
    })();
  const navigate = useNavigate();
  const cartRef = useRef(null);

  // Helper để load guest cart từ localStorage + fetch details
  const fetchLocalGuestCart = async () => {
    const localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    if (localCart.length === 0) return [];

    const itemsWithDetails = await Promise.all(
      localCart.map(async (item) => {
        try {
          const response = await api.get("/products/product", { params: { id: item.product_id } });
          if (response.data.status === "success" && response.data.data) {  // Kiểm tra thêm để tránh item null
            return { ...response.data.data, quantity: item.quantity, guest_cart_id: item.product_id }; // Giả guest_cart_id = product_id for key
          }
          return null;
        } catch (err) {
          console.warn("Failed to fetch product details for guest cart:", item.product_id, err);
          return null;
        }
      })
    );

    return itemsWithDetails.filter(item => item !== null);
  };

  // === FETCH CART ===
  const fetchCartItems = async () => {
    setLoading(true);
    setError("");
    try {
      if (user?.user_id) {  // Kiểm tra user có user_id để chắc chắn là user hợp lệ
        // User: Gọi API
        const response = await api.get("/carts");
        if (response.data.status === "success") {
          setCartItems(response.data.items || []);
        } else {
          setError(response.data.message || "Failed to fetch cart.");
        }
      } else {
        // Guest: Load từ local + fetch details
        const items = await fetchLocalGuestCart();
        setCartItems(items);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  // === MỞ CART → FETCH ===
  useEffect(() => {
    if (isOpen) fetchCartItems();

    const handleUpdate = () => {
      if (isOpen) setTimeout(fetchCartItems, 500);  // Delay nhẹ để tránh race condition sau login/merge
    };
    window.addEventListener("cartUpdated", handleUpdate);
    return () => window.removeEventListener("cartUpdated", handleUpdate);
  }, [isOpen, user]);  // Thêm dependency user để refresh khi user thay đổi (sau login)

  // === CLICK NGOÀI ĐÓNG CART ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (cartRef.current && !cartRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Helper để update guest cart trong localStorage
  const updateLocalGuestCart = (productId, newQty) => {
    let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    const existing = localCart.find(item => item.product_id === productId);
    if (existing) {
      existing.quantity = newQty;
    }
    localStorage.setItem('guest_cart', JSON.stringify(localCart));
  };

  // Helper để remove from localStorage
  const removeFromLocalGuestCart = (productId) => {
    let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    localCart = localCart.filter(item => item.product_id !== productId);
    localStorage.setItem('guest_cart', JSON.stringify(localCart));
  };

  // Helper để clear local guest cart
  const clearLocalGuestCart = () => {
    localStorage.removeItem('guest_cart');
  };

  // === THAY ĐỔI SỐ LƯỢNG ===
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (user) {
      // User: Gọi API update
      try {
        const endpoint = "/carts";
        const data = { cart_id: itemId, quantity: newQuantity };

        const response = await api.put(endpoint, data);
        if (response.data.status === "success") {
          setCartItems(prev =>
            prev.map(i => (i.cart_id === itemId ? { ...i, quantity: newQuantity } : i))
          );
          Toastify.success("Quantity updated.");
          window.dispatchEvent(new CustomEvent("cartUpdated"));
        }
      } catch (err) {
        Toastify.error("Failed to update quantity.");
      }
    } else {
      // Guest: Update local
      updateLocalGuestCart(itemId, newQuantity);
      setCartItems(prev =>
        prev.map(i => (i.product_id === itemId ? { ...i, quantity: newQuantity } : i))
      );
      Toastify.success("Quantity updated.");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    }
  };

  // === XÓA ITEM ===
  const handleRemoveItem = async (itemId) => {
    if (user) {
      // User: Gọi API delete
      try {
        const endpoint = "/carts";
        const data = { cart_id: itemId };

        const response = await api.delete(endpoint, { data });
        if (response.data.status === "success") {
          setCartItems(prev => prev.filter(i => i.cart_id !== itemId));
          Toastify.success("Item removed.");
          window.dispatchEvent(new CustomEvent("cartUpdated"));
        }
      } catch (err) {
        Toastify.error("Failed to remove item.");
      }
    } else {
      // Guest: Remove local
      removeFromLocalGuestCart(itemId);
      setCartItems(prev => prev.filter(i => i.product_id !== itemId));
      Toastify.success("Item removed.");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    }
  };

  // === XÓA TẤT CẢ ===
  const handleRemoveAll = async () => {
    if (user) {
      // User: Gọi API
      try {
        const endpoint = "/carts";
        const data = {};

        const response = await api.delete(endpoint, { data });
        if (response.data.status === "success") {
          setCartItems([]);
          Toastify.success("All items removed.");
          window.dispatchEvent(new CustomEvent("cartUpdated"));
        }
      } catch (err) {
        Toastify.error("Failed to clear cart.");
      }
    } else {
      // Guest: Clear local
      clearLocalGuestCart();
      setCartItems([]);
      Toastify.success("All items removed.");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    }
  };

  // === CHECKOUT & CONTINUE ===
  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    setIsOpen(false);
    navigate("/shop");
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * exchangeRate * (item.quantity || 1),
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div ref={cartRef} className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Shopping Cart</h2>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
            <i className="ri-close-line ri-xl"></i>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-4">Your cart is empty.</div>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {cartItems.map((item) => (
                <CartItem
                  key={user ? item.cart_id : item.product_id} // For guest, key = product_id
                  item={item}
                  user={user}
                  exchangeRate={exchangeRate}
                  onQuantityChange={handleQuantityChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>

            <div className="mb-4">
              <button
                onClick={handleRemoveAll}
                className="w-full bg-red-500 text-white py-1 rounded-lg hover:bg-red-600 transition text-sm"
              >
                Remove All
              </button>
            </div>

            <div className="border-t pt-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{subtotal.toLocaleString("vi-VN")} VND</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Shipping and taxes calculated at checkout
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={handleCheckout}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
              >
                Proceed to Checkout
              </button>
              <button
                onClick={handleContinueShopping}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
              >
                Continue Shopping
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
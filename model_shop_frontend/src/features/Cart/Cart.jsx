// src/features/Cart/Cart.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { validateUser } from "../../redux/userSlice";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import CartItem from "./CartItem";

function Cart({ isOpen, setIsOpen }) {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const exchangeRate = 25000;
  const user = useSelector((state) => state.user.user);
  const dispatch = useDispatch();
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
          if (response.data.status === "success" && response.data.data) {
            return { ...response.data.data, quantity: item.quantity, guest_cart_id: item.product_id };
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
      if (user?.user_id) {
        const response = await api.get("/carts");
        if (response.data.status === "success") {
          setCartItems(response.data.items || []); // Giả sử backend trả 'items'
        } else {
          setError(response.data.message || "Failed to fetch cart.");
        }
      } else {
        const items = await fetchLocalGuestCart();
        setCartItems(items);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        dispatch(validateUser());
      }
      setError(err.response?.data?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  // useEffect với deps để tránh loop
  useEffect(() => {
    if (isOpen) {
      fetchCartItems();
    }
  }, [isOpen, user, sessionKey]);

  // Handle quantity change
  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    try {
      if (user) {
        await api.put("/carts", { cart_id: itemId, quantity: newQuantity });
        fetchCartItems(); // FIX: Refetch sau update cho user để update UI
      } else {
        let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        const item = localCart.find(i => i.product_id === itemId);
        if (item) item.quantity = newQuantity;
        localStorage.setItem('guest_cart', JSON.stringify(localCart));
        fetchCartItems(); // Đã có cho guest
      }
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch (err) {
      if (err.response?.status === 401) {
        dispatch(validateUser());
      }
      Toastify.error("Failed to update quantity.");
    }
  };

  // Handle remove item
  const handleRemoveItem = async (itemId) => {
    try {
      if (user) {
        await api.delete("/carts", { data: { cart_id: itemId } });
        fetchCartItems(); // FIX: Refetch sau remove cho user để update UI
      } else {
        let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
        localCart = localCart.filter(i => i.product_id !== itemId);
        localStorage.setItem('guest_cart', JSON.stringify(localCart));
        fetchCartItems(); // Đã có cho guest
      }
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch (err) {
      if (err.response?.status === 401) {
        dispatch(validateUser());
      }
      Toastify.error("Failed to remove item.");
    }
  };

  // Handle remove all
  const handleRemoveAll = async () => {
    try {
      if (user) {
        await api.delete("/carts");
        fetchCartItems(); // FIX: Refetch sau remove all cho user để update UI (sẽ set empty)
      } else {
        localStorage.removeItem('guest_cart');
        setCartItems([]);
      }
      window.dispatchEvent(new CustomEvent("cartUpdated"));
    } catch (err) {
      if (err.response?.status === 401) {
        dispatch(validateUser());
      }
      Toastify.error("Failed to clear cart.");
    }
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate("/checkout");
  };

  const handleContinueShopping = () => {
    setIsOpen(false);
    navigate("/shop");
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cartRef.current && !cartRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

const subtotal = cartItems.reduce((acc, item) => {
  const priceAfterDiscount = item.discount > 0
    ? item.price * (1 - item.discount / 100)
    : item.price;
  return acc + priceAfterDiscount * item.quantity * exchangeRate;
}, 0);

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
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
                  key={user ? item.cart_id : item.product_id}
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
                <span>{Math.round(subtotal).toLocaleString("vi-VN")} VND</span>
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
// src/features/Checkout/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promotionId, setPromotionId] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [activeStep, setActiveStep] = useState(1);
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [storeId, setStoreId] = useState(null);
  const [fullNameError, setFullNameError] = useState(false);
  const [addressError, setAddressError] = useState(false);
  const [guestEmailError, setGuestEmailError] = useState(false);
  const [guestPhoneError, setGuestPhoneError] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");
  const exchangeRate = 25000;
  const user = JSON.parse(localStorage.getItem("user")); // Changed to localStorage for consistency
  const sessionKey =
    localStorage.getItem("guest_session_key") ||
    (() => {
      const newSessionKey = `guest_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      localStorage.setItem("guest_session_key", newSessionKey);
      return newSessionKey;
    })();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCsrfToken();
    fetchCartItems();
    fetchStores();
  }, [user]); // Added user dependency to refetch on user change

  const fetchCsrfToken = async () => {
    try {
      const response = await api.get("/orders?action=csrf_token", { withCredentials: true });
      if (response.data.status === "success") {
        setCsrfToken(response.data.csrf_token);
        localStorage.setItem("csrf_token", response.data.csrf_token); // Use localStorage
      }
    } catch (err) {
      console.error("Failed to fetch CSRF token:", err);
      setError("Failed to initialize session. Please refresh the page.");
      Toastify.error("Failed to initialize session.");
    }
  };

  // Helper to load guest cart from localStorage + fetch details
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

  const fetchCartItems = async () => {
    setLoading(true);
    setError("");
    try {
      if (user?.user_id) {
        // User: Call API
        const response = await api.get("/carts", { withCredentials: true });
        if (response.data.status === "success") {
          setCartItems(response.data.data || []); // Adjusted to .data assuming backend structure
        } else {
          setError(response.data.message || "Failed to fetch cart.");
        }
      } else {
        // Guest: Load from local + fetch details
        const items = await fetchLocalGuestCart();
        setCartItems(items);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await api.get("/stores");
      if (response.data.status === "success") {
        setStores(response.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode) return;
    try {
      const response = await api.get("/promotions/validate", { params: { code: promoCode } });
      if (response.data.status === "success") {
        setPromotionId(response.data.promotion_id);
        setDiscount(response.data.discount_amount || 0); // Adjust based on backend
        Toastify.success("Promo applied!");
      } else {
        setDiscount(0);
        setPromotionId(null);
        Toastify.error(response.data.message || "Invalid promo code.");
      }
    } catch (err) {
      Toastify.error("Failed to validate promo.");
    }
  };

  const validateForm = () => {
    let valid = true;
    if (!fullName) {
      setFullNameError(true);
      valid = false;
    }
    if (!address && shippingMethod !== "store_pickup") {
      setAddressError(true);
      valid = false;
    }
    if (!user) {
      if (!guestEmail) {
        setGuestEmailError(true);
        valid = false;
      }
      if (!guestPhone) {
        setGuestPhoneError(true);
        valid = false;
      }
    }
    return valid;
  };

  const handleSubmitOrder = async () => {
    if (!validateForm()) return;

    const data = {
      csrf_token: csrfToken,
      full_name: fullName,
      shipping_address: address,
      shipping_method,
      payment_method: paymentMethod,
      promotion_id: promotionId,
      store_id: shippingMethod === "store_pickup" ? storeId : null,
      cart_items: cartItems.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }))
    };

    if (!user) {
      data.guest_email = guestEmail;
      data.guest_phone = guestPhone;
    }

    try {
      const response = await api.post("/orders", data, { withCredentials: true });
      if (response.data.status === "success") {
        if (!user) localStorage.removeItem('guest_cart'); // Clear guest cart after success
        navigate("/ordersuccess", { state: { order: response.data.order } });
        Toastify.success("Order placed successfully!");
      } else {
        setError(response.data.message || "Failed to place order.");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Network error.");
      Toastify.error("Failed to place order.");
    }
  };

  const formatCurrency = (amount) => {
    return (amount * exchangeRate).toLocaleString("vi-VN") + " VND";
  };

  const subtotal = cartItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1),
    0
  );

  const shippingCost = shippingMethod === "fast" ? 50000 : shippingMethod === "express" ? 100000 : 0;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Steps and form fields remain unchanged */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">Shipping Information</h2>
            <input
              type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => { setFullName(e.target.value); setFullNameError(false); }}
              className={`border p-2 rounded w-full mb-4 ${fullNameError ? 'border-red-500' : ''}`}
            />
            {shippingMethod !== "store_pickup" ? (
              <input
                type="text"
                placeholder="Shipping Address"
                value={address}
                onChange={(e) => { setAddress(e.target.value); setAddressError(false); }}
                className={`border p-2 rounded w-full ${addressError ? 'border-red-500' : ''}`}
              />
            ) : (
              <select
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="border p-2 rounded w-full"
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.store_id} value={store.store_id}>{store.name}</option>
                ))}
              </select>
            )}
            {!user && (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={guestEmail}
                  onChange={(e) => { setGuestEmail(e.target.value); setGuestEmailError(false); }}
                  className={`border p-2 rounded w-full mb-4 ${guestEmailError ? 'border-red-500' : ''}`}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={guestPhone}
                  onChange={(e) => { setGuestPhone(e.target.value); setGuestPhoneError(false); }}
                  className={`border p-2 rounded w-full ${guestPhoneError ? 'border-red-500' : ''}`}
                />
              </>
            )}
          </div>
          {/* Shipping Methods */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">Shipping Method</h2>
            <label className="block mb-2">
              <input type="radio" value="standard" checked={shippingMethod === "standard"} onChange={(e) => setShippingMethod(e.target.value)} /> Standard (Free)
            </label>
            <label className="block mb-2">
              <input type="radio" value="fast" checked={shippingMethod === "fast"} onChange={(e) => setShippingMethod(e.target.value)} /> Fast (₫50,000)
            </label>
            <label className="block mb-2">
              <input type="radio" value="express" checked={shippingMethod === "express"} onChange={(e) => setShippingMethod(e.target.value)} /> Express (₫100,000)
            </label>
            <label className="block">
              <input type="radio" value="store_pickup" checked={shippingMethod === "store_pickup"} onChange={(e) => setShippingMethod(e.target.value)} /> Store Pickup (Free)
            </label>
          </div>
          {/* Payment Methods */}
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">Payment Method</h2>
            <label className="block mb-2">
              <input type="radio" value="cod" checked={paymentMethod === "cod"} onChange={(e) => setPaymentMethod(e.target.value)} /> Cash on Delivery
            </label>
            {/* Add more if needed */}
          </div>
          <div className="flex justify-end">
            {activeStep > 1 ? (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="bg-gray-500 text-white px-4 py-2 rounded mr-4"
              >
                Back
              </button>
            ) : null}
            <button
              onClick={handleSubmitOrder}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Place Order
            </button>
          </div>
        </div>
        <div className="w-full md:w-1/3 space-y-4">
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">Promo Code</h2>
            <div className="flex">
              <input
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="border p-2 rounded flex-1"
              />
              <button
                onClick={handleApplyPromo}
                className="bg-gray-800 text-white px-4 rounded"
              >
                →
              </button>
            </div>
            <div className="text-sm space-y-2 mb-4">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>
                  {shippingMethod === "fast"
                    ? "₫50,000"
                    : shippingMethod === "express"
                    ? "₫100,000"
                    : "FREE"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Estimated tax</span>
                <span>--</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount ({promoCode})</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(subtotal - discount + shippingCost)}</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <h2 className="text-lg font-bold mb-4">
              🛒 Cart ({cartItems.length} Items)
            </h2>
            {cartItems.map((item) => (
              <div
                key={user ? item.cart_id : item.guest_cart_id}
                className="border-b py-2"
              >
                <div className="flex justify-between font-semibold">
                  {item.name}{" "}
                  <span>{formatCurrency(item.price * exchangeRate)}</span>
                </div>
                {item.color && item.color !== "N/A" && (
                  <p className="text-sm text-gray-600">
                    Color: {item.color}
                  </p>
                )}
                {item.size && item.size !== "N/A" && (
                  <p className="text-sm text-gray-600">Size: {item.size}</p>
                )}
                <p className="text-sm text-gray-600">
                  Quantity: {item.quantity}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
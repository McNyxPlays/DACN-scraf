// src/features/checkout/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../api";
import { Toastify } from "../../components/Toastify";
import ImageWithFallback from "../../components/ImageWithFallback";
import { setLastOrder } from "../../redux/orderSlice";
import { EXCHANGE_RATE } from "../../utils/constants";

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promotionId, setPromotionId] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [csrfToken, setCsrfToken] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const sessionKey = localStorage.getItem("guest_session_key");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Auto-fill if logged in
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAddress(user.address || "");
      setGuestEmail(user.email || "");
      setGuestPhone(user.phone_number || "");
    }
  }, []);

  // Load CSRF + Cart
  useEffect(() => {
    const init = async () => {
      await fetchCsrfToken();
      await fetchCartItems();
    };
    init();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const res = await api.get("/orders?action=csrf_token");
      setCsrfToken(res.data.csrf_token);
    } catch (err) {
      Toastify.error("Failed to get CSRF token");
    }
  };

  const fetchCartItems = async () => {
    try {
      const res = user?.user_id
        ? await api.get("/cart")
        : await api.get("/cart", { params: { session_key: sessionKey } });

      setCartItems(res.data.items || []);
    } catch (err) {
      Toastify.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return Toastify.error("Please enter promo code");

    const subtotalVND = cartItems.reduce((sum, item) => {
      const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      return sum + price * item.quantity * EXCHANGE_RATE;
    }, 0);

    try {
      const res = await api.post("/promotions/apply", {
        code: promoCode,
        total_amount: subtotalVND
      }, {
        headers: { "x-csrf-token": csrfToken }
      });

      setDiscount(res.data.discount);
      setPromotionId(res.data.promotion_id);
      Toastify.success(`Promo applied successfully! -${formatCurrency(res.data.discount)}`);
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Invalid promo code");
      setDiscount(0);
      setPromotionId(null);
    }
  };

  const handleSubmitOrder = async () => {
    if (!fullName.trim() || !address.trim()) {
      return Toastify.error("Please enter full name and shipping address");
    }

    try {
      const response = await api.post("/orders", {
        csrf_token: csrfToken,
        full_name: fullName,
        address: address,
        guest_email: guestEmail || null,
        guest_phone: guestPhone || null,
        promotion_id: promotionId || null,
        session_key: user ? null : sessionKey,
        shipping_method: "standard",
        payment_method: paymentMethod
      });

      const orderData = {
        ...response.data,
        full_name: fullName,
        shipping_address: address,
        email: guestEmail || user?.email,
        phone_number: guestPhone || user?.phone_number,
        total_amount: response.data.total_amount,
        discount_amount: discount,
        shipping_cost: 0,
        details: cartItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price_at_purchase: item.discount > 0
            ? item.price * (1 - item.discount / 100)
            : item.price,
          main_image: item.main_image
        })),
        promotions: promotionId ? [{ code: promoCode }] : []
      };

      dispatch(setLastOrder(orderData));

      if (!user && sessionKey) {
        localStorage.removeItem("guest_session_key");
      }

      navigate(`/order-success?order_code=${response.data.order_code}`, {
        state: { order: orderData }
      });

      Toastify.success("Order placed successfully! Redirecting to confirmation...");
    } catch (err) {
      console.error(err);
      Toastify.error(err.response?.data?.message || "Order placement failed");
    }
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
    return sum + price * item.quantity * EXCHANGE_RATE;
  }, 0);

  const total = subtotal - discount;

  const formatCurrencyLocal = (amount) => {
    return `₫${Math.round(amount).toLocaleString("vi-VN")}`;
  };

  if (loading) return <div className="text-center py-20 text-2xl">Loading cart...</div>;
  if (cartItems.length === 0) return <div className="text-center py-20 text-2xl">Cart is empty</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl mx-auto">
      <h1 className="text-4xl font-bold text-center mb-10 text-green-600">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Shipping Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="p-4 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="p-4 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Detailed Shipping Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="p-4 border rounded-lg col-span-2"
                required
              />
              {!user && (
                <input
                  type="email"
                  placeholder="Email (for invoice)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="p-4 border rounded-lg col-span-2"
                />
              )}
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="p-4 border rounded-lg col-span-2"
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="vnpay">VNPay</option>
              </select>
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-white p-6 rounded-xl shadow">
            <h3 className="text-xl font-bold mb-4">Promo Code</h3>
            <div className="flex gap-3">
              <input
                placeholder="Enter code..."
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="flex-1 p-4 border rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && handleApplyPromo()}
              />
              <button
                onClick={handleApplyPromo}
                className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700"
              >
                Apply
              </button>
            </div>
            {discount > 0 && <p className="text-green-600 font-bold mt-3">Discount Applied: -{formatCurrencyLocal(discount)}</p>}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow sticky top-6">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-6">
              {cartItems.map((item) => {
                const priceAfterDiscount = item.discount > 0
                  ? item.price * (1 - item.discount / 100)
                  : item.price;
                const displayPrice = priceAfterDiscount * EXCHANGE_RATE;

                return (
                  <div key={item.cart_id} className="flex gap-4 pb-4 border-b">
                    <ImageWithFallback
                      src={`/Uploads/products/${item.main_image || "placeholder.jpg"}`}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">{item.name}</h4>
                      <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrencyLocal(displayPrice * item.quantity)}</p>
                      {item.discount > 0 && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrencyLocal(item.price * EXCHANGE_RATE * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-3 text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-primary">{formatCurrencyLocal(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Discount</span>
                  <span>-{formatCurrencyLocal(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold text-primary pt-4 border-t">
                <span>Total</span>
                <span>{formatCurrencyLocal(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              className="w-full mt-8 bg-primary text-white py-5 rounded-xl text-xl font-bold hover:bg-primary/90 transition transform hover:scale-105 shadow-lg"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
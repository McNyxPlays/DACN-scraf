// src/features/Checkout/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import ImageWithFallback from "../../components/ImageWithFallback";


export default function Checkout() {

  const NEED_PAYMENT = true; // Toggle this to true/false to require payment or not

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
  const exchangeRate = 25000;

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const sessionKey = localStorage.getItem("guest_session_key");
  const navigate = useNavigate();

  // Auto-fill user info if logged in
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAddress(user.address || "");
      setGuestEmail(user.email || "");
      setGuestPhone(user.phone_number || "");
    }
  }, [user]);

  useEffect(() => {
    fetchCsrfToken();
    fetchCartItems();
  }, []);

  const fetchCsrfToken = async () => {
    try {
      const res = await api.get("/orders?action=csrf_token");
      setCsrfToken(res.data.csrf_token);
    } catch (err) {
      console.error("CSRF Error:", err);
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
    if (!promoCode.trim()) return Toastify.error("Please enter a promo code");
    const subtotal = cartItems.reduce((sum, item) => {
      const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
      return sum + price * item.quantity * exchangeRate;
    }, 0);

    try {
      const res = await api.post("/promotions/apply", { code: promoCode, total_amount: subtotal }, {
        headers: { "x-csrf-token": csrfToken }
      });
      setDiscount(res.data.discount);
      setPromotionId(res.data.promotion_id);
      Toastify.success("Promo code applied!");
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Invalid promo code");
    }
  };

  const handleSubmitOrder = async () => {
    if (!fullName.trim() || !address.trim()) {
      return Toastify.error("Please enter full name and address");
    }
    if (NEED_PAYMENT) {
      const paymentSuccess = true; 
      if (!paymentSuccess) {
        return Toastify.error("Payment failed");
      }
    }

    try {
      await api.post("/orders", {
        csrf_token: csrfToken,
        full_name: fullName,
        address,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        promotion_id: promotionId || null,
        session_key: user ? null : sessionKey
      });

      localStorage.removeItem("guest_session_key");
      navigate("/ordersuccess");
      Toastify.success("Order placed successfully!");
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Failed to place order");
    }
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.discount > 0 ? item.price * (1 - item.discount / 100) : item.price;
    return sum + price * item.quantity * exchangeRate;
  }, 0);

  const total = subtotal - discount;

  const formatCurrency = (amount) => `₫${Math.round(amount).toLocaleString("en-US")}`;

  if (loading) return <div className="text-center py-20 text-xl">Loading...</div>;
  if (cartItems.length === 0) return <div className="text-center py-20 text-xl">Your cart is empty</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold text-center mb-10">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Shipping Information */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Shipping Information</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              />
              <input
                type="text"
                placeholder="Delivery Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 border rounded-lg"
                required
              />
              {!user && (
                <>
                  <input
                    type="email"
                    placeholder="Email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full p-3 border rounded-lg"
                  />
                </>
              )}
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Promo Code</h2>
            <div className="flex gap-3">
              <input
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1 p-3 border rounded-lg"
              />
              <button onClick={handleApplyPromo} className="bg-primary text-white px-6 rounded-lg font-medium hover:bg-primary/90">
                Apply
              </button>
            </div>
            {discount > 0 && <p className="text-green-600 font-medium mt-3">Discount applied: -{formatCurrency(discount)}</p>}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow sticky top-6">
            <h2 className="text-xl font-bold mb-5">Order Summary</h2>

            <div className="space-y-4 max-h-96 overflow-y-auto mb-5">
              {cartItems.map((item) => {
                const priceAfterDiscount = item.discount > 0
                  ? item.price * (1 - item.discount / 100)
                  : item.price;
                const displayPrice = priceAfterDiscount * exchangeRate;

                return (
                  <div key={item.cart_id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-16 h-16 flex-shrink-0">
                      <ImageWithFallback
                        src={`/Uploads/products/${item.main_image || "placeholder.jpg"}`}
                        alt={item.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm line-clamp-2">{item.name}</h4>
                      {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                      {item.size && <p className="text-xs text-gray-500">Size: {item.size}</p>}
                      <p className="text-xs text-gray-600 mt-1">Qty: {item.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{formatCurrency(displayPrice * item.quantity)}</p>
                      {item.discount > 0 && (
                        <p className="text-xs text-gray-500 line-through">
                          {formatCurrency(item.price * exchangeRate * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between text-lg">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-xl font-bold text-primary">
                <span>Total Amount</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              className="w-full mt-6 bg-primary text-white py-4 rounded-lg text-lg font-bold hover:bg-primary/90 transition"
            >
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
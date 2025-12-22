// src/features/checkout/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../api";
import { Toastify } from "../../components/Toastify";
import ImageWithFallback from "../../components/ImageWithFallback";
import { setLastOrder } from "../../redux/orderSlice";
import { formatCurrency } from "../../utils/formatCurrency";

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promotionId, setPromotionId] = useState(null);
  const [discountUSD, setDiscountUSD] = useState(0);
  const [csrfToken, setCsrfToken] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const sessionKey = localStorage.getItem("guest_session_key");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Auto-fill fields for logged-in users
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAddress(user.address || "");
      setGuestEmail(user.email || "");
      setGuestPhone(user.phone_number || "");
    }
  }, [user]);

  // Load CSRF token and cart items on mount
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

      setCartItems(res.data.data || []);
    } catch (err) {
      Toastify.error("Failed to load cart");
    } finally {
      setLoading(false);
    }
  };

  // Calculate prices in USD
  const subtotalUSD = cartItems.reduce((sum, item) => {
    const price = item.discount > 0
      ? item.price * (1 - item.discount / 100)
      : item.price;
    return sum + price * item.quantity;
  }, 0);

  const totalUSD = subtotalUSD - discountUSD;

  // Subtotal in VND (for backend promo validation)
  const subtotalVND = subtotalUSD * 25000;

  // Apply promo code
  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      return Toastify.error("Please enter promo code");
    }

    try {
      const res = await api.post(
        "/promotions/apply",
        { code: promoCode, total_amount: subtotalVND },
        { headers: { "x-csrf-token": csrfToken } }
      );

      const discountVND = res.data.discount || 0;
      setDiscountUSD(discountVND / 25000);
      setPromotionId(res.data.promotion_id);
      Toastify.success(`Promo applied! -${formatCurrency(discountVND / 25000)}`);
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Invalid promo code");
      setDiscountUSD(0);
      setPromotionId(null);
    }
  };

  // Place order
  const handleSubmitOrder = async () => {
    if (!fullName.trim() || !address.trim()) {
      return Toastify.error("Please enter your full name and address");
    }

    try {
      const params = {
        csrf_token: csrfToken,
        full_name: fullName,
        address,
        guest_email: guestEmail,
        guest_phone: guestPhone,
        shipping_method: "standard",
        payment_method: paymentMethod,
        store_id: null,
        promotion_id: promotionId,
        session_key: sessionKey,
      };

      const res = await api.post("/orders", params);

      if (res.data.status === "success") {
        dispatch(setLastOrder(res.data.order_code));
        Toastify.success("Order placed successfully!");
        // Redirect to success page with order code as query param
        navigate(`/order-success?order_code=${res.data.order_code}`);
      }
    } catch (err) {
      console.error("Order placement error:", err);
      const errorMessage =
        err.response?.data?.message ||
        (err.response?.status === 403 ? "Invalid CSRF token - please refresh the page" : err.message) ||
        "Failed to place order. Please try again.";

      Toastify.error(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl font-medium">Loading checkout...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-7xl">
      <h1 className="text-4xl font-bold mb-12 text-center">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left column: Shipping info, Payment, Promo */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Information */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-xl font-bold mb-4">Shipping Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                placeholder="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="px-5 py-3 border rounded-lg"
                required
              />
              <input
                placeholder="Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="px-5 py-3 border rounded-lg"
                required
              />
              <input
                placeholder="Email (for invoice)"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="px-5 py-3 border rounded-lg"
              />
              <input
                placeholder="Phone Number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="px-5 py-3 border rounded-lg"
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-xl font-bold mb-4">Payment Method</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  value="cod"
                  checked={paymentMethod === "cod"}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="form-radio"
                />
                <span>Cash on Delivery</span>
              </label>
              {/* Add other payment methods here if needed */}
            </div>
          </div>

          {/* Promo Code */}
          <div className="bg-white p-6 rounded-2xl shadow">
            <h3 className="text-xl font-bold mb-4">Promo Code</h3>
            <div className="flex gap-3">
              <input
                placeholder="Enter code..."
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === "Enter" && handleApplyPromo()}
                className="flex-1 px-5 py-3 border rounded-lg"
              />
              <button
                onClick={handleApplyPromo}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-2xl shadow sticky top-6">
            <h2 className="text-2xl font-bold mb-8">Order Summary</h2>

            <div className="max-h-96 overflow-y-auto space-y-5 mb-8">
              {cartItems.map((item) => {
                const priceAfterDiscount = item.discount > 0
                  ? item.price * (1 - item.discount / 100)
                  : item.price;

                return (
                  <div key={item.cart_id} className="flex gap-4 pb-5 border-b">
                    <ImageWithFallback
                      src={`/Uploads/products/${item.main_image || "placeholder.jpg"}`}
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <h4 className="font-medium line-clamp-2">{item.name}</h4>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      {item.is_nft_eligible === 1 && (
                        <p className="text-sm text-gray-600">
                          NFT: {item.receive_nft ? "Yes" : "No"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">
                        {formatCurrency(priceAfterDiscount * item.quantity)}
                      </p>
                      {item.discount > 0 && (
                        <p className="text-sm text-gray-500 line-through">
                          {formatCurrency(item.price * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t-2 pt-6 space-y-4 text-lg">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-blue-600">{formatCurrency(subtotalUSD)}</span>
              </div>

              {discountUSD > 0 && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>Discount</span>
                  <span>-{formatCurrency(discountUSD)}</span>
                </div>
              )}

              <div className="flex justify-between text-3xl font-bold text-blue-600 pt-6 border-t-2">
                <span>Total</span>
                <span>{formatCurrency(totalUSD)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmitOrder}
              className="w-full mt-10 bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-xl text-2xl font-bold shadow-lg transition transform hover:scale-105"
            >
              Confirm Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
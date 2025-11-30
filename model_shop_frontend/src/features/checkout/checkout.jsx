// src/features/checkout/Checkout.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import api from "../../api";
import { Toastify } from "../../components/Toastify";
import ImageWithFallback from "../../components/ImageWithFallback";
import { setLastOrder } from "../../redux/orderSlice";
import { formatCurrency } from "../../utils/formatCurrency"; // ← Chỉ cần import này

export default function Checkout() {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [address, setAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promotionId, setPromotionId] = useState(null);
  const [discountUSD, setDiscountUSD] = useState(0); // lưu USD
  const [csrfToken, setCsrfToken] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");

  const user = JSON.parse(localStorage.getItem("user") || "null");
  const sessionKey = localStorage.getItem("guest_session_key");
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Auto-fill nếu đã đăng nhập
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setAddress(user.address || "");
      setGuestEmail(user.email || "");
      setGuestPhone(user.phone_number || "");
    }
  }, [user]);

  // Load CSRF + giỏ hàng
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

  // === TÍNH TOÁN GIÁ (USD) ===
  const subtotalUSD = cartItems.reduce((sum, item) => {
    const price = item.discount > 0
      ? item.price * (1 - item.discount / 100)
      : item.price;
    return sum + price * item.quantity;
  }, 0);

  const totalUSD = subtotalUSD - discountUSD;

  // Dùng VND để gửi promo (backend yêu cầu VND)
  const subtotalVND = subtotalUSD * 25000;

  // === ÁP DỤNG MÃ GIẢM GIÁ ===
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
      setDiscountUSD(discountVND / 25000); // chuyển về USD để tính tổng
      setPromotionId(res.data.promotion_id);
      Toastify.success(`Promo applied! -${formatCurrency(discountVND / 25000)}`);
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Invalid promo code");
      setDiscountUSD(0);
      setPromotionId(null);
    }
  };

  // === ĐẶT HÀNG ===
  const handleSubmitOrder = async () => {
  if (!fullName.trim() || !address.trim()) {
    return Toastify.error("Please enter full name and shipping address");
  }

  try {
    const response = await api.post("/orders", {
      csrf_token: csrfToken,
      full_name: fullName,
      address,
      guest_email: guestEmail || null,
      guest_phone: guestPhone || null,
      promotion_id: promotionId || null,
      session_key: user ? null : sessionKey,
      shipping_method: "standard",
      payment_method: paymentMethod,
    });

    // Tạo dữ liệu đơn hàng để lưu vào Redux + hiển thị OrderSuccess
    const orderData = {
      ...response.data,
      full_name: fullName,
      shipping_address: address,
      email: guestEmail || user?.email,
      phone_number: guestPhone || user?.phone_number,
      total_amount: totalUSD * 25000,
      discount_amount: discountUSD * 25000,
      shipping_cost: 0,
      details: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price_at_purchase: item.discount > 0
          ? item.price * (1 - item.discount / 100)
          : item.price,
        main_image: item.image_url || item.main_image,
      })),
    };

    // Lưu vào Redux
    dispatch(setLastOrder(orderData));

    // XÓA GIỎ HÀNG TRÊN SERVER (user hoặc guest)
    try {
      const deletePayload = user?.user_id ? {} : { session_key: sessionKey };
      await api.delete("/cart", { data: deletePayload });
    } catch (err) {
      console.warn("Không thể xóa cart trên server (không ảnh hưởng trải nghiệm)", err);
    }

    // QUAN TRỌNG: Cập nhật ngay số lượng trên Header (badge về 0)
    window.dispatchEvent(new CustomEvent("cartUpdated"));

    // Xóa session_key của guest (không còn cần nữa)
    if (!user && sessionKey) {
      localStorage.removeItem("guest_session_key");
    }

    // Chuyển sang trang thành công
    navigate(`/order-success?order_code=${response.data.order_code}`, {
      state: { order: orderData },
    });

    Toastify.success("Order placed successfully!");

  } catch (err) {
    Toastify.error(err.response?.data?.message || "Order failed");
  }
};

  if (loading) return <div className="text-center py-20 text-2xl">Loading cart...</div>;
  if (cartItems.length === 0) return <div className="text-center py-20 text-2xl">Your cart is empty</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold text-center mb-12 text-gray-800">Checkout</h1>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* === LEFT: FORM + PROMO === */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Info */}
          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <input
                type="text"
                placeholder="Full Name *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="px-5 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
              <input
                type="text"
                placeholder="Phone Number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="px-5 py-3 border rounded-lg"
              />
              <input
                type="text"
                placeholder="Shipping Address *"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="md:col-span-2 px-5 py-3 border rounded-lg"
                required
              />
              {!user && (
                <input
                  type="email"
                  placeholder="Email (for invoice)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="md:col-span-2 px-5 py-3 border rounded-lg"
                />
              )}
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="md:col-span-2 px-5 py-3 border rounded-lg"
              >
                <option value="cod">Cash on Delivery (COD)</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="vnpay">VNPay</option>
              </select>
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

        {/* === RIGHT: ORDER SUMMARY === */}
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
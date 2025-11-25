// src/features/OrderStatus.jsx
import React, { useState } from "react";
import api from "../../api/index";
import ImageWithFallback from "../../components/ImageWithFallback";
import { usePDFHandlers } from "../../utils/usePDFHandlers";
import {formatCurrency} from "../../utils/formatCurrency";
import { Toastify } from "../../components/Toastify";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

const OrderStatus = () => {
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [viewType, setViewType] = useState(null);
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.user);

  const { handleDownloadPDF, handleViewPDF } = usePDFHandlers(orderData);

  const handleCheckStatus = async () => {
    try {
      const res = await api.get("/orders", { params: { action: "status", order_code: orderCode } });
      if (res.data.status === "success") {
        setOrderData(res.data.data);
        setViewType("status");
        setError("");
      } else {
        setError(res.data.message || "Order not found");
      }
    } catch (err) {
      setError("Failed to check status");
    }
  };

  const handleCheckInvoice = async () => {
    try {
      const res = await api.get("/orders", { params: { action: "invoice", order_code: orderCode } });
      if (res.data.status === "success") {
        setOrderData(res.data.data);
        setViewType("invoice");
        setError("");
      } else {
        setError(res.data.message || "Order not found");
      }
    } catch (err) {
      setError("Failed to load invoice");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderData.order_code);
    Toastify.success("Order code copied!");
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <h1 className="text-5xl font-bold text-center mb-12 text-gray-800">Track Your Order</h1>

          <div className="max-w-xl mx-auto mb-12">
            <input
              type="text"
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
              placeholder="Enter order code (e.g., ORD-12345)"
              className="w-full px-8 py-5 text-xl border-2 border-gray-300 rounded-2xl focus:border-blue-500 focus:outline-none mb-6"
            />
            {error && <p className="text-red-500 text-center text-lg mb-6">{error}</p>}
            <div className="grid grid-cols-2 gap-6">
              <button onClick={handleCheckStatus} className="bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-2xl font-bold text-xl transition">
                Check Status
              </button>
              <button onClick={handleCheckInvoice} className="bg-green-600 hover:bg-green-700 text-white py-5 rounded-2xl font-bold text-xl transition">
                View Invoice
              </button>
            </div>
          </div>

          {orderData && viewType === "invoice" && (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-10 mt-10">
              <h2 className="text-4xl font-bold text-center mb-10">ORDER INVOICE</h2>

              <p className="text-center text-2xl font-mono cursor-pointer hover:text-blue-600 mb-10" onClick={handleCopyCode}>
                <strong>Order Code:</strong> {orderData.order_code} <span className="text-lg opacity-70"></span>
              </p>

              <div className="grid md:grid-cols-2 gap-10 text-xl mb-10">
                <div>
                  <p><strong>Customer:</strong> {orderData.full_name || "N/A"}</p>
                  <p><strong>Phone:</strong> {orderData.phone_number || "N/A"}</p>
                  <p><strong>Email:</strong> {orderData.email || "N/A"}</p>
                </div>
               <div className="text-right">
  {/* SỬA DÒNG NÀY */}
<p>
    <strong>Subtotal:</strong> {formatCurrency(
      orderData.total_amount 
      - orderData.shipping_cost 
      + (orderData.discount_amount ? orderData.discount_amount / 25000 : 0)
    )}
  </p>
  
  <p><strong>Shipping:</strong> {orderData.shipping_cost === 0 ? "Free" : formatCurrency(orderData.shipping_cost)}</p>
  
  {orderData.discount_amount > 0 && (
    <p className="text-red-600 font-bold">
      <strong>Discount:</strong> -{formatCurrency(orderData.discount_amount)}
    </p>
  )}
  
  <p className="text-4xl font-bold text-green-600 mt-6">
    <strong>Total:</strong> {formatCurrency(orderData.total_amount)}
  </p>
</div>
              </div>

              <h3 className="text-3xl font-bold mt-12 mb-8 text-gray-800">Products</h3>
              <div className="space-y-6">
                {orderData.details?.map((item, i) => (
                  <div key={i} className="flex items-center gap-6 py-6 border-b-2 border-gray-200">
                    <ImageWithFallback
                      src={`/Uploads/products/${item.main_image || "placeholder.jpg"}`}
                      alt={item.name}
                      className="w-24 h-24 object-cover rounded-xl"
                    />
                    <div className="flex-1">
                      <p className="text-xl font-semibold">{item.name}</p>
                      <p className="text-gray-600">
                        {item.quantity} × {formatCurrency(item.price_at_purchase)}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(item.price_at_purchase * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-6 mt-12">
                <button onClick={async () => await handleViewPDF()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl transition transform hover:scale-105">
                  View PDF
                </button>
                <button onClick={async () => await handleDownloadPDF()} className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl transition transform hover:scale-105">
                  Download PDF
                </button>
                {user?.user_id && (
                  <button
                    onClick={() => navigate("/profile/orders")}
                    className="bg-gray-800 hover:bg-gray-900 text-white px-10 py-5 rounded-2xl font-bold text-xl shadow-xl transition transform hover:scale-105"
                  >
                    View Order History
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderStatus;
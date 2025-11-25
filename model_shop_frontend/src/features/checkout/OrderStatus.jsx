// src/features/OrderStatus.jsx
import React, { useState } from "react";
import api from "../../api/index";
import ImageWithFallback from "../../components/ImageWithFallback";
import { usePDFHandlers } from "../../utils/usePDFHandlers";
import { formatCurrency } from "../../utils/formatCurrency";

const OrderStatus = () => {
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [viewType, setViewType] = useState(null);

  const { handleDownloadPDF, handleViewPDF } = usePDFHandlers(orderData); // Deduplicated handlers

  const handleCheckStatus = async () => {
    try {
      const response = await api.get("/orders", { params: { action: "status", order_code: orderCode } });
      if (response.data.status === "success") {
        setOrderData(response.data.data);
        setViewType("status");
        setError("");
      } else {
        setError(response.data.message || "Order not found.");
        setOrderData(null);
        setViewType(null);
      }
    } catch (err) {
      setError("Status check error: " + (err.response?.data?.message || err.message));
      setOrderData(null);
      setViewType(null);
    }
  };

  const handleCheckInvoice = async () => {
    try {
      const response = await api.get("/orders", { params: { action: "invoice", order_code: orderCode } });
      if (response.data.status === "success") {
        setOrderData(response.data.data);
        setViewType("invoice");
        setError("");
      } else {
        setError(response.data.message || "Order not found.");
        setOrderData(null);
        setViewType(null);
      }
    } catch (err) {
      setError("Invoice check error: " + (err.response?.data?.message || err.message));
      setOrderData(null);
      setViewType(null);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Check Order</h1>
        <input
          type="text"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value.toUpperCase())}
          placeholder="Enter order code (e.g., ORD-12345)"
          className="w-full p-3 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <div className="flex justify-center gap-4 mb-6">
          <button onClick={handleCheckStatus} className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
            Order Status
          </button>
          <button onClick={handleCheckInvoice} className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600">
            Order Invoice
          </button>
        </div>
        {orderData && viewType === "status" && (
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-2">Order Status</h2>
            <p><strong>Order Code:</strong> {orderData.order_code}</p>
            <p><strong>Status:</strong> {orderData.current_status.toUpperCase()}</p>
            <p><strong>Last Updated:</strong> {new Date(orderData.last_updated).toLocaleString("en-US")}</p>
          </div>
        )}
        {orderData && viewType === "invoice" && (
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner space-y-4">
            <h2 className="text-xl font-semibold mb-2">Order Invoice</h2>
            <p><strong>Order Code:</strong> {orderData.order_code}</p>
            <p><strong>Subtotal:</strong> {formatCurrency(orderData.total_amount - orderData.shipping_cost + (orderData.discount_amount || 0))}</p>
            <p><strong>Shipping Fee:</strong> {orderData.shipping_cost === 0 ? "Free" : formatCurrency(orderData.shipping_cost)}</p>
            <p className="text-red-600"><strong>Discount:</strong> {orderData.discount_amount > 0 ? `-${formatCurrency(orderData.discount_amount)}` : "None"}</p>
            <p className="text-xl font-bold text-green-600"><strong>Total:</strong> {formatCurrency(orderData.total_amount)}</p>
            <h3 className="mt-4 font-semibold">Product Details:</h3>
            <ul className="space-y-4">
              {orderData.details?.map((item, index) => (
                <li key={index} className="flex items-center gap-4 border-b pb-2">
                  <ImageWithFallback
                    src={`/Uploads/products/${item.main_image || "placeholder.jpg"}`}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-600">Quantity: {item.quantity}</p>
                    <p className="text-sm text-gray-600">Price: {formatCurrency(item.price_at_purchase)}</p>
                  </div>
                  <p className="font-bold text-right">{formatCurrency(item.price_at_purchase * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="flex justify-center gap-4 mt-6">
              <button onClick={handleViewPDF} className="bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700">
                View PDF
              </button>
              <button onClick={handleDownloadPDF} className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700">
                Download PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatus;
import React, { useState } from "react";
import api from "../../api/index";

const OrderStatus = () => {
  const [orderCode, setOrderCode] = useState("");
  const [error, setError] = useState("");
  const [orderData, setOrderData] = useState(null);
  const [viewType, setViewType] = useState(null);

  const handleCheckStatus = async () => {
    try {
      const response = await api.get("/orders", {
        params: { action: "status", order_code: orderCode },
      });
      if (response.data.status === "success") {
        setOrderData(response.data.data);
        setViewType("status");
        setError("");
      } else {
        setError(response.data.message || "Order not found or invalid code.");
        setOrderData(null);
        setViewType(null);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Error checking order status: " + (err.response?.data?.message || err.message));
      setOrderData(null);
      setViewType(null);
    }
  };

  const handleCheckInvoice = async () => {
    try {
      const response = await api.get("/orders", {
        params: { action: "invoice", order_code: orderCode },
      });
      if (response.data.status === "success") {
        setOrderData(response.data.data);
        setViewType("invoice");
        setError("");
      } else {
        setError(response.data.message || "Order not found or invalid code.");
        setOrderData(null);
        setViewType(null);
      }
    } catch (err) {
      console.error("API Error:", err);
      setError("Error checking order invoice: " + (err.response?.data?.message || err.message));
      setOrderData(null);
      setViewType(null);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Check Order</h1>
        <input
          type="text"
          value={orderCode}
          onChange={(e) => setOrderCode(e.target.value)}
          placeholder="Enter Order Code"
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={handleCheckStatus}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Order Status
          </button>
          <button
            onClick={handleCheckInvoice}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Order Invoice
          </button>
        </div>
        {orderData && viewType === "status" && (
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-2">Order Status</h2>
            <p><strong>Order Code:</strong> {orderData.order_code}</p>
            <p><strong>Status:</strong> {orderData.current_status}</p>
            <p><strong>Last Updated:</strong> {new Date(orderData.last_updated).toLocaleString()}</p>
          </div>
        )}
        {orderData && viewType === "invoice" && (
          <div className="p-4 bg-gray-50 rounded-lg shadow-inner">
            <h2 className="text-xl font-semibold mb-2">Order Invoice</h2>
            <p><strong>Order Code:</strong> {orderData.order_code}</p>
            <p><strong>Total Amount:</strong> ${orderData.total_amount}</p>
            <p><strong>Discount:</strong> ${orderData.discount_amount}</p>
            <p><strong>Shipping Cost:</strong> ${orderData.shipping_cost}</p>
            <h3 className="mt-4 font-semibold">Details:</h3>
            <ul className="list-disc pl-5">
              {orderData.details.map((item, index) => (
                <li key={index}>
                  {item.name} - Qty: {item.quantity} - Price: ${item.price_at_purchase}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderStatus;
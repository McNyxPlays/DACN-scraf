// src/features/checkout/OrderSuccess.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import api from "../../api";
import { setLastOrder } from "../../redux/orderSlice";
import { formatCurrency } from "../../utils/formatCurrency";
import { usePDFHandlers } from "../../utils/usePDFHandlers";
import { Toastify } from "../../components/Toastify";

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const stateOrder = location.state?.order;
  const lastOrderFromRedux = useSelector((state) => state.order.lastOrder);
  const params = new URLSearchParams(location.search);
  const orderCode = params.get("order_code");
  const user = useSelector((state) => state.user.user);

  const { handleDownloadPDF, handleViewPDF } = usePDFHandlers(order);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (stateOrder?.order_id) {
          setOrder(stateOrder);
          dispatch(setLastOrder(stateOrder));
          setLoading(false);
          return;
        }
        if (lastOrderFromRedux?.order_id) {
          setOrder(lastOrderFromRedux);
          setLoading(false);
          return;
        }
        if (orderCode) {
          const res = await api.get(`/orders/code/${orderCode}`);
          setOrder(res.data.order);
          dispatch(setLastOrder(res.data.order));
          setLoading(false);
          return;
        }
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setLoading(false);
      }
    };
    fetchOrder();
  }, [stateOrder, lastOrderFromRedux, orderCode, dispatch]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(order.order_code);
    Toastify.success("Order code copied!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-2xl font-medium">Loading order...</div>
      </div>
    );
  }

  if (!order?.order_id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center text-center py-20">
        <h1 className="text-5xl font-bold text-red-600 mb-8">Order Not Found</h1>
        <button
          onClick={() => navigate("/")}
          className="bg-blue-600 text-white px-10 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-16 text-center rounded-t-3xl">
          <h1 className="text-6xl font-bold mb-4">ORDER SUCCESSFUL!</h1>
          <p
            className="text-2xl cursor-pointer hover:underline inline-flex items-center gap-2"
            onClick={handleCopyCode}
          >
            Order Code: {order.order_code} <i className="ri-file-copy-line"></i>
          </p>
          <p className="text-lg mt-2">
            Thank you for your purchase. You'll receive a confirmation soon.
          </p>
        </div>

        {/* Body */}
        <div className="p-10 grid lg:grid-cols-2 gap-10">
          {/* Customer Information */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Customer Information</h2>
            <div className="space-y-4 text-lg text-gray-700">
              <p><strong>Name:</strong> {order.full_name}</p>
              <p><strong>Shipping Address:</strong> {order.shipping_address || order.address}</p>
              <p><strong>Email:</strong> {order.email || "N/A"}</p>
              <p><strong>Phone:</strong> {order.phone_number || "N/A"}</p>
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-gray-800">Order Summary</h2>
            <div className="bg-gray-50 rounded-2xl p-8 space-y-5">
              <div className="flex justify-between text-xl">
                <span>Subtotal</span>
                <span className="font-bold text-blue-600">
                  {formatCurrency((order.total_amount - order.shipping_cost + (order.discount_amount || 0)) / 25000)}
                </span>
              </div>
              <div className="flex justify-between text-xl">
                <span>Shipping Fee</span>
                <span className="font-bold">
                  {order.shipping_cost === 0 ? "Free" : formatCurrency(order.shipping_cost / 25000)}
                </span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-xl text-red-600 font-bold">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount / 25000)}</span>
                </div>
              )}
              <div className="pt-6 border-t-4 border-gray-300">
                <div className="flex justify-between text-4xl font-bold text-blue-600">
                  <span>Total Amount</span>
                  <span>{formatCurrency(order.total_amount / 25000)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-center gap-6 p-10">
          <button
            onClick={async () => await handleViewPDF()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-12 py-5 rounded-2xl font-bold text-xl rounded-xl shadow-xl transition transform hover:scale-105"
          >
            View Invoice
          </button>
          <button
            onClick={async () => await handleDownloadPDF()}
            className="bg-green-600 hover:bg-green-700 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl transition transform hover:scale-105"
          >
            Download PDF
          </button>
          {user?.user_id && (
            <button
              onClick={() => navigate("/profile/orders")}
              className="bg-gray-800 hover:bg-gray-900 text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl transition transform hover:scale-105"
            >
              View Order History
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
// src/features/checkout/OrderSuccess.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import api from "../../api";
import { setLastOrder } from "../../redux/orderSlice";
import { formatCurrency } from "../../utils/formatCurrency";
import { usePDFHandlers } from "../../utils/usePDFHandlers";

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

  if (loading) {
    return <div className="min-h-screen bg-gray-100 flex items-center justify-center text-2xl">Loading...</div>;
  }

  if (!order?.order_id) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold text-red-600 mb-4">Order Not Found</h1>
          <p className="mb-6">The link may have expired or the order does not exist.</p>
          <button onClick={() => navigate("/")} className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-green-600 text-white py-8 text-center">
          <h1 className="text-4xl font-bold">ORDER SUCCESSFUL!</h1>
          <p className="text-xl mt-3">Order Code: <strong className="text-2xl">{order.order_code}</strong></p>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-bold mb-2">Customer Information</h2>
              <p><strong>Name:</strong> {order.full_name}</p>
              <p><strong>Address:</strong> {order.shipping_address}</p>
              <p><strong>Email:</strong> {order.email}</p>
              <p><strong>Phone:</strong> {order.phone_number}</p>
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Order Summary</h2>
              <p><strong>Subtotal:</strong> {formatCurrency(order.total_amount - order.shipping_cost + (order.discount_amount || 0))}</p>
              <p><strong>Shipping Fee:</strong> {order.shipping_cost === 0 ? "Free" : formatCurrency(order.shipping_cost)}</p>
              {order.discount_amount > 0 && <p className="text-red-600"><strong>Discount:</strong> -{formatCurrency(order.discount_amount)}</p>}
              <p className="text-xl font-bold text-green-600"><strong>Total:</strong> {formatCurrency(order.total_amount)}</p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <button onClick={handleViewPDF} className="bg-indigo-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-3">
              View Invoice
            </button>
            <button onClick={handleDownloadPDF} className="bg-green-600 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 flex items-center gap-3">
              Download PDF
            </button>
            <button onClick={() => navigate("/profile/orders")} className="bg-gray-700 text-white px-8 py-4 rounded-lg font-bold hover:bg-gray-800">
              View Order History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
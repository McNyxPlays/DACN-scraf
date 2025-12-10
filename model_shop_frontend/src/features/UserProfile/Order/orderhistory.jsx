// src/features/UserProfile/Order/orderhistory.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux"; // Để lấy user từ Redux
import api from "../../../api/index"; // Giả sử api ở đây
import { Toastify } from "../../../components/Toastify";
import OrderHistorySidebar from "./leftsidebar";
import OrderHistoryDetailsView from "./detailsview";

function OrderHistory() {
  const user = useSelector((state) => state.user.user); // Lấy user từ Redux
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await api.get("/user/orders", {
          params: { user_id: user.user_id },
        });
        if (response.data.status === "success") {
          setOrders(response.data.orders || []);
        } else {
          Toastify.error(response.data.message || "Failed to load orders");
        }
      } catch (err) {
        Toastify.error("Network error");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.user_id]);

  if (loading) {
    return <div className="text-center py-12">Loading orders...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <OrderHistorySidebar
          orders={orders}
          selectedOrder={selectedOrder}
          setSelectedOrder={setSelectedOrder}
        />
        <div className="w-full lg:w-2/3">
          {selectedOrder ? (
            <OrderHistoryDetailsView orders={orders} selectedOrder={selectedOrder} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                No order selected
              </h3>
              <p className="text-gray-500">
                Select an order from the list to view details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderHistory;
// src/features/UserProfile/Order/leftsidebar.jsx
import React from "react";

function OrderHistorySidebar({ orders, selectedOrder, setSelectedOrder }) {
  return (
    <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Orders</h2>
      <div className="space-y-3">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div
              key={order.order_id}
              className={`cursor-pointer p-4 rounded-lg border border-gray-100 transition-all duration-200 ${
                selectedOrder === order.order_id
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "hover:bg-gray-50 hover:border-gray-200"
              }`}
              onClick={() => setSelectedOrder(order.order_id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900 truncate">
                  Order #{order.order_code}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(order.date).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1">{order.status}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No orders yet.</p>
        )}
      </div>
    </div>
  );
}

export default OrderHistorySidebar;
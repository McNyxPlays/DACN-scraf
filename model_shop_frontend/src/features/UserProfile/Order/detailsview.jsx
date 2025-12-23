// src/features/UserProfile/Order/detailsview.jsx
import React from "react";
import api from "../../../api/index"; // Để gọi API download invoice
import { Toastify } from "../../../components/Toastify";
import { formatCurrency } from "../../../utils/formatCurrency"; // Import hàm format

function OrderHistoryDetailsView({ orders, selectedOrder }) {
  const order = orders.find((o) => o.order_id === selectedOrder);

  if (!order) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Order details
        </h3>
        <p className="text-gray-500">Order not found.</p>
      </div>
    );
  }

  const orderDetails = [
    {
      label: "Order Code",
      value: order.order_code,
    },
    {
      label: "Status",
      value: order.status,
    },
    {
      label: "Order Date",
      value: new Date(order.date).toLocaleString(),
    },
    {
      label: "Total",
      value: formatCurrency(order.total),
    },
    // Thêm các field khác nếu cần, ví dụ từ API chi tiết
    // {
    //   label: "Payment Method",
    //   value: order.payment_method || "Bank Transfer",
    // },
    // {
    //   label: "Shipping Address",
    //   value: order.shipping_address || "123 ABC Street, District 1, Ho Chi Minh City",
    // },
  ];

  const handleDownloadInvoice = async () => {
    try {
      // Sử dụng order_code thay vì order_id để khớp với backend
      const response = await api.get(`/orders/invoice`, {
        params: { order_code: order.order_code },
        responseType: "blob", // Để nhận PDF binary
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${order.order_code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toastify.success("Invoice downloaded");
    } catch (err) {
      Toastify.error("Failed to download invoice");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-xl font-semibold text-gray-900 mb-4">
        Order Details #{order.order_code}
      </h3>
      <div className="space-y-4">
        {orderDetails.map((detail, index) => (
          <div
            key={index}
            className="flex justify-between border-b border-gray-100 py-2"
          >
            <span className="text-gray-600">{detail.label}</span>
            <span className="text-gray-900 font-medium">{detail.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={handleDownloadInvoice}
        className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
      >
        Download Invoice
      </button>
    </div>
  );
}

export default OrderHistoryDetailsView;
// src/features/Checkout/OrderSuccess.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";

const OrderSuccess = () => {
  const { state } = useLocation();
  const order = state?.order || {};
  const exchangeRate = 25000;

  const formatCurrency = (amount) => {
    const value = (Number(amount) * exchangeRate).toFixed(2);
    return `₫${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text("Order Invoice", 105, 20, { align: "center" });

    // Order Info
    doc.setFontSize(12);
    doc.text(`Order Code: ${order.order_code || "N/A"}`, 20, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Full Name: ${order.full_name || "N/A"}`, 20, 60);
    doc.text(`Address: ${order.address || "N/A"}`, 20, 70);
    doc.text(`Email: ${order.email || "N/A"}`, 20, 80);
    doc.text(`Phone: ${order.phone_number || "N/A"}`, 20, 90);

    // Items Table
    if (order.details?.length > 0) {
      doc.autoTable({
        startY: 100,
        head: [["Item", "Quantity", "Price"]],
        body: order.details.map((item) => [
          item.name,
          item.quantity,
          formatCurrency(item.price_at_purchase)
        ]),
      });
    }

    // Totals
    const finalY = doc.lastAutoTable.finalY || 100;
    doc.text(`Subtotal: ${formatCurrency(order.total_amount - order.shipping_cost + (order.discount_amount || 0))}`, 20, finalY + 20);
    doc.text(`Shipping: ${order.shipping_cost === 0 ? "Free" : formatCurrency(order.shipping_cost)}`, 20, finalY + 30);
    if (order.discount_amount > 0) {
      doc.text(`Discount: -${formatCurrency(order.discount_amount)}`, 20, finalY + 40);
    }
    doc.text(`Total: ${formatCurrency(order.total_amount)}`, 20, finalY + 50);

    // Save PDF
    doc.save(`invoice_${order.order_code}.pdf`);
  };

  if (!order.order_id) {
    return (
      <div className="bg-gray-100 min-h-screen p-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-6">Error</h1>
          <p className="text-lg">No order information available.</p>
          <button
            onClick={() => (window.location.href = "/")}
            className="mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">
          Order Success
        </h1>
        <h2 className="text-2xl font-semibold mb-4 text-center">
          Invoice Statement
        </h2>
        <p className="text-lg text-center">
          Thank you for your order! Your order number is{" "}
          <strong>{order.order_code || "N/A"}</strong>.
        </p>
        {order.promotions?.length > 0 && order.discount_amount > 0 && (
          <p className="text-lg text-center mt-4">
            Promo code <strong>{order.promotions[0]?.code || "N/A"}</strong>{" "}
            applied, saving you{" "}
            <strong>{formatCurrency(order.discount_amount)}</strong>.
          </p>
        )}
        <div className="mt-6 bg-white p-6 rounded shadow">
          <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
          <div className="space-y-4">
            {order.details?.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold mb-2">Items Ordered</h4>
                {order.details.map((item, index) => (
                  <div key={index} className="border-b py-2">
                    <p>{item.name} - Qty: {item.quantity} - Price: {formatCurrency(item.price_at_purchase)}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {formatCurrency(
                    order.total_amount -
                      order.shipping_cost +
                      (order.discount_amount || 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>{order.shipping_cost === 0 ? "Free" : formatCurrency(order.shipping_cost)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatCurrency(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
            {order.shipping_method === "store_pickup" ? (
              <div className="mt-4">
                <h4 className="text-lg font-semibold">Pickup Location</h4>
                <p>Store ID: {order.store_id || "N/A"}</p>
              </div>
            ) : (
              <div className="mt-4">
                <h4 className="text-lg font-semibold">Shipping Address</h4>
                <p>{order.shipping_address || "N/A"}</p>
              </div>
            )}
          </div>
        </div>
        <div className="text-center mt-6">
          <button
            onClick={handleDownloadPDF}
            className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 mr-4"
          >
            Download Invoice PDF
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
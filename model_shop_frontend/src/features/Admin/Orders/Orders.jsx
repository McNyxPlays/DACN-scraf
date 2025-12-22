// model_shop_frontend/src/features/Admin/Orders/Orders.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isUpdateStatusOpen, setIsUpdateStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [editFormData, setEditFormData] = useState({ order_id: null });

  useEffect(() => {
    fetchOrders();
  }, [search, filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (filterStatus) params.status = filterStatus;
      const response = await api.get("/orders/mana", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setOrders(response.data.data);
      } else {
        setOrders([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setOrders([]);
      setError(err.response?.data?.message || "An error occurred while fetching orders");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderDetail = async (order_code) => {
    try {
      setError("");
      const response = await api.get(`/orders/code/${order_code}`);
      if (response.data.status === "success") {
        setSelectedOrder(response.data.order);
        setIsDetailModalOpen(true);
      } else {
        setError(response.data.message || "Failed to fetch order detail");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !editFormData.order_id) return setError("Select a new status");
    try {
      setError("");
      const response = await api.put("/orders/mana", { order_id: editFormData.order_id, status: newStatus });
      if (response.data.status === "success") {
        Toastify.success("Order status updated successfully");
        fetchOrders();
        setIsUpdateStatusOpen(false);
        setNewStatus("");
      } else {
        setError(response.data.message || "Failed to update status");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const openUpdateStatusModal = (order_id) => {
    setEditFormData({ order_id });
    setNewStatus("");
    setIsUpdateStatusOpen(true);
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Order Management</h1>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search orders by code or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center">No orders found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Order ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Code</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">User</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Total</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id} className="border-b">
                  <td className="py-3 px-4">{order.order_id}</td>
                  <td className="py-3 px-4">{order.order_code}</td>
                  <td className="py-3 px-4">{order.full_name} ({order.email})</td>
                  <td className="py-3 px-4">${Number(order.total_amount).toFixed(2)}</td>
                  <td className="py-3 px-4">{order.status}</td>
                  <td className="py-3 px-4">{new Date(order.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => fetchOrderDetail(order.order_code)} className="text-blue-500 hover:text-blue-700 mr-2">
                      View
                    </button>
                    <button onClick={() => openUpdateStatusModal(order.order_id)} className="text-green-500 hover:text-green-700">
                      Update Status
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl my-8">
            <h2 className="text-xl font-bold mb-4">Order Detail - {selectedOrder.order_code}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p><strong>User:</strong> {selectedOrder.full_name} ({selectedOrder.email})</p>
                <p><strong>Shipping Address:</strong> {selectedOrder.shipping_address}</p>
                <p><strong>Payment Method:</strong> {selectedOrder.payment_method}</p>
                <p><strong>Total Amount:</strong> ${Number(selectedOrder.total_amount).toFixed(2)}</p>
                <p><strong>Discount:</strong> ${Number(selectedOrder.discount).toFixed(2)}</p>
                <p><strong>Status:</strong> {selectedOrder.status}</p>
                <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold mb-2">Order Items</h3>
            <table className="min-w-full bg-white border border-gray-200 mb-4">
              <thead>
                <tr>
                  <th className="py-2 px-4 text-left">Product</th>
                  <th className="py-2 px-4 text-left">Quantity</th>
                  <th className="py-2 px-4 text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.details.map((item) => (
                  <tr key={item.product_id}>
                    <td className="py-2 px-4">{item.name}</td>
                    <td className="py-2 px-4">{item.quantity}</td>
                    <td className="py-2 px-4">${Number(item.price).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedOrder.promotions && (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">Promotions</h3>
                {selectedOrder.promotions.map((promo) => (
                  <p key={promo.promotion_id}>{promo.name} - Discount: ${Number(promo.applied_discount).toFixed(2)}</p>
                ))}
              </div>
            )}

            {selectedOrder.nfts && (
              <div className="mb-4">
                <h3 className="text-lg font-bold mb-2">NFTs</h3>
                {selectedOrder.nfts.map((nft) => (
                  <p key={nft.token_id}>Token ID: {nft.token_id} - Tx Hash: {nft.tx_hash}</p>
                ))}
              </div>
            )}

            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isUpdateStatusOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-md my-8">
            <h2 className="text-xl font-bold mb-4">Update Order Status</h2>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary mb-4"
            >
              <option value="">Select Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex gap-4">
              <button onClick={() => handleUpdateStatus()} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">
                Update
              </button>
              <button
                onClick={() => {
                  setIsUpdateStatusOpen(false);
                  setNewStatus("");
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
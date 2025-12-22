// model_shop_frontend/src/features/Admin/Reports/Sales.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";

const Sales = () => {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, [search, status, startDate, endDate]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (status) params.status = status;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get("/reports/sales", { params });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setSales(response.data.data);
        setError("");
      } else {
        setSales([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setSales([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError("Server error: " + err.response.data.message);
        } else {
          setError("Server error: " + (err.response.statusText || "Unknown error"));
        }
      } else {
        setError("Failed to fetch sales: " + (err.message || "Unknown error"));
      }
      console.error("Fetch sales error:", err);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Sales</h1>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search sales by order code or user ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <div className="flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      {sales.length === 0 ? (
        <p className="text-gray-500 text-center">No sales found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Order ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">User ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Order Code</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Total Price</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Quantity</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.order_id} className="border-b">
                  <td className="py-3 px-4">{sale.order_id}</td>
                  <td className="py-3 px-4">{sale.user_id}</td>
                  <td className="py-3 px-4">{sale.order_code}</td>
                  <td className="py-3 px-4">{sale.total_price}</td>
                  <td className="py-3 px-4">{sale.quantity || "N/A"}</td>
                  <td className="py-3 px-4">{sale.status}</td>
                  <td className="py-3 px-4">{new Date(sale.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Sales;
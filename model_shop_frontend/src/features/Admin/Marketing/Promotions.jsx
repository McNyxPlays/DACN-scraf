// model_shop_frontend/src/features/Admin/Marketing/Promotions.jsx
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    promotion_id: 0,
    name: "",
    code: "",
    discount_percentage: 0,
    start_date: "",
    end_date: "",
    max_usage: null,
    status: "active",
    usage_count: 0,
    is_active: true,
  });

  const navigate = useNavigate();

  useEffect(() => {
    fetchPromotions();
  }, [search, filterStatus]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError("");
      const params = {
        search: search || undefined,
        status: filterStatus || undefined,
      };
      const response = await api.get("/promotions/mana", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setPromotions(response.data.data);
      } else {
        setError(response.data.message || "Failed to fetch promotions");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred while fetching data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      promotion_id: 0,
      name: "",
      code: "",
      discount_percentage: 0,
      start_date: "",
      end_date: "",
      max_usage: null,
      status: "active",
      usage_count: 0,
      is_active: true,
    });
    setError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : (type === "number" ? parseFloat(value) || 0 : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      let response;
      if (isAddModalOpen) {
        response = await api.post("/promotions/mana", formData);
      } else {
        if (isNaN(formData.promotion_id) || formData.promotion_id <= 0) {
          setError("Invalid promotion ID");
          return;
        }
        response = await api.put(`/promotions/mana?id=${formData.promotion_id}`, formData);
      }

      if (response.data.status === "success") {
        Toastify.success(isAddModalOpen ? "Promotion added successfully" : "Promotion updated successfully");
        fetchPromotions();
        isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
        resetForm();
      } else {
        setError(response.data.message || "Failed to save promotion");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "An error occurred";
      setError(errMsg === "Invalid promotion ID" ? "Invalid promotion ID" : errMsg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return;
    if (isNaN(id) || id <= 0) {
      setError("Invalid promotion ID");
      return;
    }
    try {
      setError("");
      const response = await api.delete(`/promotions/mana?id=${id}`);
      if (response.data.status === "success") {
        Toastify.success("Promotion deleted successfully");
        fetchPromotions();
      } else {
        setError(response.data.message || "Failed to delete promotion");
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || "An error occurred";
      setError(errMsg === "Invalid promotion ID" ? "Invalid promotion ID" : errMsg);
      console.error(err);
    }
  };

  const openEditModal = async (promotion) => {
    if (isNaN(promotion.promotion_id) || promotion.promotion_id <= 0) {
      setError("Invalid promotion ID");
      return;
    }
    try {
      setError("");
      setFormData({
        promotion_id: promotion.promotion_id,
        name: promotion.name,
        code: promotion.code,
        discount_percentage: promotion.discount_percentage,
        start_date: promotion.start_date ? promotion.start_date.split('T')[0] : "",
        end_date: promotion.end_date ? promotion.end_date.split('T')[0] : "",
        max_usage: promotion.max_usage,
        status: promotion.status,
        usage_count: promotion.usage_count,
        is_active: promotion.is_active,
      });
      setIsEditModalOpen(true);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Failed to load promotion for edit";
      setError(errMsg === "Invalid promotion ID" ? "Invalid promotion ID" : errMsg);
      console.error("Failed to load promotion for edit:", err);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading promotions...</p>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Promotion Management</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
          >
            Add Promotion
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or code..."
          className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => setError("")}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
          </button>
        </div>
      )}

      {promotions.length === 0 ? (
        <p className="text-center text-gray-500">No promotions found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b text-left">Name</th>
                <th className="px-4 py-2 border-b text-left">Code</th>
                <th className="px-4 py-2 border-b text-left">Discount (%)</th>
                <th className="px-4 py-2 border-b text-left">Start Date</th>
                <th className="px-4 py-2 border-b text-left">End Date</th>
                <th className="px-4 py-2 border-b text-left">Usage Count</th>
                <th className="px-4 py-2 border-b text-left">Max Usage</th>
                <th className="px-4 py-2 border-b text-left">Status</th>
                <th className="px-4 py-2 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.promotion_id}>
                  <td className="px-4 py-2 border-b">{promotion.name}</td>
                  <td className="px-4 py-2 border-b">{promotion.code}</td>
                  <td className="px-4 py-2 border-b">{promotion.discount_percentage}</td>
                  <td className="px-4 py-2 border-b">{new Date(promotion.start_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 border-b">{promotion.end_date ? new Date(promotion.end_date).toLocaleDateString() : "N/A"}</td>
                  <td className="px-4 py-2 border-b">{promotion.usage_count}</td>
                  <td className="px-4 py-2 border-b">{promotion.max_usage || "Unlimited"}</td>
                  <td className="px-4 py-2 border-b">{promotion.status}</td>
                  <td className="px-4 py-2 border-b text-center">
                    <button
                      onClick={() => openEditModal(promotion)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(promotion.promotion_id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">
              {isAddModalOpen ? "Add New Promotion" : "Edit Promotion"}
            </h2>
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button 
                  onClick={() => setError("")}
                  className="absolute top-0 bottom-0 right-0 px-4 py-3"
                >
                  <svg className="fill-current h-6 w-6 text-red-500" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Code</label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Discount (%)</label>
                  <input
                    type="number"
                    name="discount_percentage"
                    value={formData.discount_percentage}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">End Date (Optional)</label>
                  <input
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Max Usage (Optional)</label>
                  <input
                    type="number"
                    name="max_usage"
                    value={formData.max_usage || ""}
                    onChange={handleChange}
                    min="1"
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <label className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Active
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  {isAddModalOpen ? "Add Promotion" : "Update Promotion"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promotions;
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";
import { format, parse } from "date-fns";

const PromotionsManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    discount_percentage: 0,
    start_date: "",
    end_date: "",
    status: "active",
    usage_count: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchPromotions();
  }, [search, status]);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (status) params.status = status;
      const response = await api.get("/promotions", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setPromotions(response.data.data);
        setError("");
      } else {
        setPromotions([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setPromotions([]);
      setError("Failed to fetch promotions: " + (err.message || "Unknown error"));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      name: "",
      code: "",
      discount_percentage: 0,
      start_date: "",
      end_date: "",
      status: "active",
      usage_count: 0,
      is_active: true,
    });
    setShowModal(true);
    setError("");
  };

  const openEditModal = (promotion) => {
    setModalMode("edit");
    setFormData({
      name: promotion.name || "",
      code: promotion.code || "",
      discount_percentage: promotion.discount_percentage || 0,
      start_date: promotion.start_date ? format(new Date(promotion.start_date), "dd/MM/yyyy") : "",
      end_date: promotion.end_date ? format(new Date(promotion.end_date), "dd/MM/yyyy") : "",
      status: promotion.status || "active",
      usage_count: promotion.usage_count || 0,
      is_active: promotion.is_active !== undefined ? promotion.is_active : true,
    });
    setShowModal(true);
    setError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const parseDateInput = (value) => {
    if (!value) return "";
    try {
      const parsed = parse(value, "dd/MM/yyyy", new Date());
      return format(parsed, "yyyy-MM-dd");
    } catch {
      return value;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      setError("Discount percentage must be between 0 and 100");
      return;
    }
    if (formData.usage_count < 0) {
      setError("Usage count cannot be negative");
      return;
    }
    if (new Date(parseDateInput(formData.end_date)) <= new Date(parseDateInput(formData.start_date))) {
      setError("End date must be after start date");
      return;
    }

    const requestData = {
      ...formData,
      start_date: parseDateInput(formData.start_date),
      end_date: parseDateInput(formData.end_date),
      usage_count: parseInt(formData.usage_count),
      is_active: formData.is_active,
    };
    try {
      const response = await api.post("/promotions", requestData);
      if (response.data.status === "success") {
        Toastify.success("Promotion added successfully");
        navigate("/admin/promotions");
      } else {
        setError(response.data.message || "Failed to add promotion");
      }
    } catch (err) {
      setError("Failed to add promotion: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.discount_percentage < 0 || formData.discount_percentage > 100) {
      setError("Discount percentage must be between 0 and 100");
      return;
    }
    if (formData.usage_count < 0) {
      setError("Usage count cannot be negative");
      return;
    }
    if (new Date(parseDateInput(formData.end_date)) <= new Date(parseDateInput(formData.start_date))) {
      setError("End date must be after start date");
      return;
    }

    const requestData = {
      ...formData,
      start_date: parseDateInput(formData.start_date),
      end_date: parseDateInput(formData.end_date),
      usage_count: parseInt(formData.usage_count),
      is_active: formData.is_active,
    };
    try {
      const response = await api.put(`/promotions?id=${formData.promotion_id}`, requestData);
      if (response.data.status === "success") {
        closeModal();
        fetchPromotions();
      } else {
        setError(response.data.message || "Failed to update promotion");
      }
    } catch (err) {
      setError("Failed to update promotion: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this promotion?")) return;
    try {
      const response = await api.delete(`/promotions?id=${id}`);
      if (response.data.status === "success") {
        fetchPromotions();
      } else {
        setError(response.data.message || "Failed to delete promotion");
      }
    } catch (err) {
      setError("Failed to delete promotion: " + (err.message || "Unknown error"));
      console.error(err);
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Promotions Management</h1>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add Promotion
        </button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search promotions..."
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
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="expired">Expired</option>
        </select>
      </div>
      {promotions.length === 0 ? (
        <p className="text-gray-500 text-center">No promotions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Code</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Discount (%)</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Start Date</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">End Date</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Usage Count</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Active</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Updated At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((promotion) => (
                <tr key={promotion.promotion_id} className="border-b">
                  <td className="py-3 px-4">{promotion.promotion_id}</td>
                  <td className="py-3 px-4">{promotion.name}</td>
                  <td className="py-3 px-4">{promotion.code}</td>
                  <td className="py-3 px-4">{promotion.discount_percentage}</td>
                  <td className="py-3 px-4">{promotion.start_date}</td>
                  <td className="py-3 px-4">{promotion.end_date}</td>
                  <td className="py-3 px-4">{promotion.status}</td>
                  <td className="py-3 px-4">{promotion.usage_count}</td>
                  <td className="py-3 px-4">{promotion.is_active ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">{new Date(promotion.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{new Date(promotion.updated_at).toLocaleString()}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(promotion)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(promotion.promotion_id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Add New Promotion" : "Edit Promotion"}
            </h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={modalMode === "add" ? handleSubmit : handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Code</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Discount Percentage</label>
                <input
                  type="number"
                  name="discount_percentage"
                  value={formData.discount_percentage}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  required
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Usage Count</label>
                <input
                  type="number"
                  name="usage_count"
                  value={formData.usage_count}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Start Date</label>
                <input
                  type="text"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">End Date</label>
                <input
                  type="text"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center text-gray-700 mb-2">
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
                  {modalMode === "add" ? "Add Promotion" : "Update Promotion"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
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

export default PromotionsManagement;
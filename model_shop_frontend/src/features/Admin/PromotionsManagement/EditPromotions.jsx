import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, parse } from "date-fns";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const EditPromotions = () => {
  const { id } = useParams();
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
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPromotion = async () => {
      try {
        const response = await api.get(`/promotions?id=${id}`);
        if (response.data.status === "success" && response.data.data && response.data.data.length > 0) {
          const promotion = response.data.data[0];
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
        } else {
          setError(response.data.message || "Promotion not found");
        }
      } catch (err) {
        setError("Failed to fetch promotion: " + (err.message || "Unknown error"));
        console.error(err);
      }
    };
    fetchPromotion();
  }, [id]);

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
      const response = await api.put(`/promotions?id=${id}`, requestData);
      if (response.data.status === "success") {
        Toastify.success("Promotion updated successfully");
        navigate("/admin/promotions");
      } else {
        setError(response.data.message || "Failed to update promotion");
      }
    } catch (err) {
      setError("Failed to update promotion: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Promotion</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="max-w-4xl overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
            <div>
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
            <div>
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
            <div>
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
            <div>
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
            <div>
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
            <div>
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
            <div>
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
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
            >
              Update Promotion
            </button>
            <button
              type="button"
              onClick={() => navigate("/admin/promotions")}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPromotions;
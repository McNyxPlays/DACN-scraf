// model_shop_frontend/src/features/Admin/Catalog/Categories.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";
import { useNavigate } from "react-router-dom";

const Categories = () => {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [editCategoryId, setEditCategoryId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const params = search ? { search } : {};
      const response = await api.get("/categories/mana", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
        setError("");
      } else {
        setCategories([]);
        setError("Invalid response format from server");
      }
    } catch (err) {
      setCategories([]);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to fetch categories: " + (err.message || "Unknown error"));
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      name: "",
      description: "",
    });
    setShowModal(true);
    setError("");
  };

  const openEditModal = (category) => {
    setModalMode("edit");
    setEditCategoryId(category.category_id);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowModal(true);
    setError("");
  };

  const closeModal = () => {
    setShowModal(false);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (modalMode === "add") {
        const response = await api.post("/categories/mana", formData);
        if (response.data.status === "success") {
          Toastify.success("Category added successfully");
          closeModal();
          fetchCategories();
        } else {
          setError(response.data.message || "Failed to add category");
        }
      } else {
        const response = await api.put(`/categories/mana?id=${editCategoryId}`, formData);
        if (response.data.status === "success") {
          Toastify.success("Category updated successfully");
          closeModal();
          fetchCategories();
        } else {
          setError(response.data.message || "Failed to update category");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      const response = await api.delete(`/categories/mana?id=${id}`);
      if (response.data.status === "success") {
        Toastify.success("Category deleted successfully");
        fetchCategories();
      } else {
        setError(response.data.message || "Failed to delete category");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCategories();
  };

  if (loading) return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Categories</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/admin')}
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Back to Dashboard
          </button>
          <button
            onClick={openAddModal}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
          >
            Add Category
          </button>
        </div>
      </div>
      <form onSubmit={handleSearchSubmit} className="mb-6 flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <FaSearch className="absolute top-3 right-3 text-gray-500" />
        </div>
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">
          Search
        </button>
      </form>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {categories.length === 0 ? (
        <p className="text-center text-gray-500">No categories found</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr>
                <th className="px-4 py-2 border-b text-left">Name</th>
                <th className="px-4 py-2 border-b text-left">Description</th>
                <th className="px-4 py-2 border-b text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.category_id}>
                  <td className="px-4 py-2 border-b">{category.name}</td>
                  <td className="px-4 py-2 border-b">{category.description}</td>
                  <td className="px-4 py-2 border-b text-center">
                    <button
                      onClick={() => openEditModal(category)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.category_id)}
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">
              {modalMode === "add" ? "Add New Category" : "Edit Category"}
            </h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
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
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="4"
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  {modalMode === "add" ? "Add Category" : "Update Category"}
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

export default Categories;
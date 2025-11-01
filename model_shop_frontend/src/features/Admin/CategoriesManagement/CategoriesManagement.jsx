import React, { useState, useEffect } from "react";
import api from "../../../api/index";

const CategoriesManagement = () => {
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

  useEffect(() => {
    fetchCategories();
  }, [search]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      const response = await api.get("/categories", { params });
      if (
        response.data.status === "success" &&
        Array.isArray(response.data.data)
      ) {
        setCategories(response.data.data);
        setError("");
      } else {
        setCategories([]);
        setError("Invalid response format from server");
      }
    } catch (err) {
      setCategories([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("Failed to fetch categories");
        }
      } else {
        setError(
          "Failed to fetch categories: " + (err.message || "Unknown error")
        );
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
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (modalMode === "add") {
        response = await api.post("/categories", formData);
      } else {
        response = await api.put(`/categories?id=${editCategoryId}`, formData);
      }
      if (response.data.status === "success") {
        fetchCategories();
        closeModal();
      } else {
        setError(response.data.message || "Failed to save category");
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to save category");
      }
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        const response = await api.delete(`/categories?id=${id}`);
        if (response.data.status === "success") {
          fetchCategories();
        } else {
          setError(response.data.message || "Failed to delete category");
        }
      } catch (err) {
        setError("Failed to delete category");
        console.error(err);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Categories Management</h1>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add New Category
        </button>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : error ? (
        <p className="text-red-500 mb-4">{error}</p>
      ) : categories.length === 0 ? (
        <div className="text-center py-4">No categories found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-md">
            <thead>
              <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                <th className="py-3 px-6 text-left">Name</th>
                <th className="py-3 px-6 text-left">Description</th>
                <th className="py-3 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-600 text-sm font-light">
              {categories.map((category) => (
                <tr key={category.category_id} className="border-b border-gray-200 hover:bg-gray-100">
                  <td className="py-3 px-6">{category.name}</td>
                  <td className="py-3 px-6">{category.description || "No description"}</td>
                  <td className="py-3 px-6 flex justify-center gap-2">
                    <button
                      onClick={() => openEditModal(category)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.category_id)}
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

export default CategoriesManagement;
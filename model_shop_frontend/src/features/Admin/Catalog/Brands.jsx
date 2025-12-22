// model_shop_frontend/src/features/Admin/Catalog/Brands.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";
import { useNavigate } from "react-router-dom";

const Brands = () => {
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [editBrandId, setEditBrandId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError("");
      const params = search ? { search } : {};
      const response = await api.get("/brands/mana", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setBrands(response.data.data);
        setError("");
      } else {
        setBrands([]);
        setError("Invalid response format from server");
      }
    } catch (err) {
      setBrands([]);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to fetch brands: " + (err.message || "Unknown error"));
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

  const openEditModal = (brand) => {
    setModalMode("edit");
    setEditBrandId(brand.brand_id);
    setFormData({
      name: brand.name,
      description: brand.description || "",
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
        const response = await api.post("/brands/mana", formData);
        if (response.data.status === "success") {
          Toastify.success("Brand added successfully");
          closeModal();
          fetchBrands();
        } else {
          setError(response.data.message || "Failed to add brand");
        }
      } else {
        const response = await api.put(`/brands/mana?id=${editBrandId}`, formData);
        if (response.data.status === "success") {
          Toastify.success("Brand updated successfully");
          closeModal();
          fetchBrands();
        } else {
          setError(response.data.message || "Failed to update brand");
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;
    try {
      const response = await api.delete(`/brands/mana?id=${id}`);
      if (response.data.status === "success") {
        Toastify.success("Brand deleted successfully");
        fetchBrands();
      } else {
        setError(response.data.message || "Failed to delete brand");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchBrands();
  };

  if (loading) return <p className="text-center text-gray-500">Loading...</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Brands</h1>
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
            Add Brand
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
      {brands.length === 0 ? (
        <p className="text-center text-gray-500">No brands found</p>
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
              {brands.map((brand) => (
                <tr key={brand.brand_id}>
                  <td className="px-4 py-2 border-b">{brand.name}</td>
                  <td className="px-4 py-2 border-b">{brand.description}</td>
                  <td className="px-4 py-2 border-b text-center">
                    <button
                      onClick={() => openEditModal(brand)}
                      className="text-blue-500 hover:text-blue-700 mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(brand.brand_id)}
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
              {modalMode === "add" ? "Add New Brand" : "Edit Brand"}
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
                  {modalMode === "add" ? "Add Brand" : "Update Brand"}
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

export default Brands;
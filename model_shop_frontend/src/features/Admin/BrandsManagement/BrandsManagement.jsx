import React, { useState, useEffect } from "react";
import api from "../../../api/index";

const BrandsManagement = () => {
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

  useEffect(() => {
    fetchBrands();
  }, [search]);

  const fetchBrands = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      const response = await api.get("/brands", { params });
      if (
        response.data.status === "success" &&
        Array.isArray(response.data.data)
      ) {
        setBrands(response.data.data);
        setError("");
      } else {
        setBrands([]);
        setError("Invalid response format from server");
      }
    } catch (err) {
      setBrands([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError(err.response.data.message);
        } else {
          setError("Failed to fetch brands");
        }
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
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let response;
      if (modalMode === "add") {
        response = await api.post("/brands", formData);
      } else {
        response = await api.put(`/brands?id=${editBrandId}`, formData);
      }
      if (response.data.status === "success") {
        closeModal();
        fetchBrands();
      } else {
        setError(response.data.message || "Failed to save brand");
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to save brand");
      }
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this brand?")) return;
    try {
      const response = await api.delete(`/brands?id=${id}`);
      if (response.data.status === "success") {
        fetchBrands();
      } else {
        setError(response.data.message || "Failed to delete brand");
      }
    } catch (err) {
      setError("Failed to delete brand: " + (err.message || "Unknown error"));
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Brands Management</h1>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add Brand
        </button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
      </div>
      {brands.length === 0 ? (
        <p className="text-gray-500 text-center">No brands found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Description</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Updated At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.brand_id} className="border-b">
                  <td className="py-3 px-4">{brand.brand_id}</td>
                  <td className="py-3 px-4">{brand.name}</td>
                  <td className="py-3 px-4">{brand.description}</td>
                  <td className="py-3 px-4">{new Date(brand.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{new Date(brand.updated_at).toLocaleString()}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(brand)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(brand.brand_id)}
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

export default BrandsManagement;
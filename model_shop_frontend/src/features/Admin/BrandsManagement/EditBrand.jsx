import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api from "../../../api/index";

const EditBrand = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const response = await api.get(`/brands?id=${id}`);
        if (
          response.data.status === "success" &&
          response.data.data.length > 0
        ) {
          const brand = response.data.data[0];
          setFormData({
            name: brand.name,
            description: brand.description || "",
          });
        } else {
          setError("Brand not found");
        }
      } catch (err) {
        setError("Failed to fetch brand");
        console.error(err);
      }
    };
    fetchBrand();
  }, [id]);

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
      const response = await api.put(`/brands?id=${id}`, formData);
      if (response.data.status === "success") {
        navigate("/admin/brands");
      } else {
        setError(response.data.message || "Failed to update brand");
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to update brand");
      }
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit Brand</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="max-w-lg">
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
            Update Brand
          </button>
          <Link
            to="/admin/brands"
            className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
          >
            Back
          </Link>
        </div>
      </form>
    </div>
  );
};

export default EditBrand;
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { addUser } from "../../../api/index";

const AddUser = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    phone_number: "",
    address: "",
    role: "user",
    gender: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const validateForm = () => {
    if (!formData.email) {
      setError("Email is required");
      return false;
    }
    if (!formData.password) {
      setError("Password is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Invalid email format");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    try {
      const data = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === "is_active") {
          data.append(key, formData[key] ? "1" : "0");
        } else {
          data.append(key, formData[key] || "");
        }
      });

      const response = await addUser(data);
      if (response.data.success) {
        navigate("/admin/users");
      } else {
        setError(response.data.message || "Failed to add user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add user");
      console.error("Add user error:", err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add New User</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="max-w-4xl overflow-y-auto" style={{ maxHeight: "70vh" }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter email"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter full name"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter phone number"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="user">User</option>
                <option value="support">Support</option>
                <option value="admin">Admin</option>
                <option value="customizer">Customizer</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary h-24"
              placeholder="Enter address"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="mr-2 h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-gray-700">Active</span>
            </label>
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
            >
              Add User
            </button>
            <Link
              to="/admin/users"
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              Back
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUser;
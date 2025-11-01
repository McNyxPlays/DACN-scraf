import React, { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import api, { getUserById, updateUserById } from "../../../api/index";

const EditUser = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    phone_number: "",
    address: "",
    role: "user",
    gender: "",
    is_active: true,
  });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getUserById(id);
        if (response.data.success && response.data.data.length > 0) {
          const user = response.data.data[0];
          setFormData({
            email: user.email || "",
            full_name: user.full_name || "",
            phone_number: user.phone_number || "",
            address: user.address || "",
            role: user.role || "user",
            gender: user.gender || "",
            is_active: Boolean(user.is_active),
          });
        } else {
          setError("User not found");
        }
      } catch (err) {
        setError("Failed to fetch user: " + (err.response?.data?.message || err.message));
      }
    };
    const checkAuth = async () => {
      try {
        const response = await api.get("/user");
        if (!response.data.success || response.data.user.role !== "admin") {
          setError("Unauthorized: Admin access required");
          navigate("/admin/users");
        }
      } catch (err) {
        setError("Failed to verify user: " + (err.response?.data?.message || err.message));
        navigate("/admin/users");
      }
    };
    fetchUser();
    checkAuth();
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const validateForm = () => {
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
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
        data.append(key, formData[key] || "");
      });

      const response = await updateUserById(id, data);
      if (response.data.success) {
        navigate("/admin/users");
      } else {
        setError(response.data.message || "Failed to update user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update user");
      console.error(err);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Edit User</h1>
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
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Phone Number</label>
              <input
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
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
            <div>
              <label className="block text-gray-700 mb-2">Status</label>
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
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary h-24"
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
            >
              Update User
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

export default EditUser;
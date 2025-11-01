import React, { useState, useEffect } from "react";
import api, { getUsers, addUser, updateUserById, deleteUser } from "../../../api/index";
import { FaSearch, FaUser, FaTrash } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("add");
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
  const [editUserId, setEditUserId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [search, isActive]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (isActive >= 0) params.is_active = isActive;
      const response = await getUsers(params);
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
        setError("");
      } else {
        setUsers([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setUsers([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError("Server error: " + err.response.data.message);
        } else {
          setError("Server error: " + (err.response.statusText || "Unknown error"));
        }
      } else {
        setError("Failed to fetch users: " + (err.message || "Unknown error"));
      }
      console.error("Fetch users error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setModalMode("add");
    setFormData({
      email: "",
      password: "",
      full_name: "",
      phone_number: "",
      address: "",
      role: "user",
      gender: "",
      is_active: true,
    });
    setShowModal(true);
    setError("");
  };

  const openEditModal = async (userId) => {
    try {
      const response = await getUserById(userId);
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
        setEditUserId(userId);
        setModalMode("edit");
        setShowModal(true);
        setError("");
      } else {
        setError("User not found");
      }
    } catch (err) {
      setError("Failed to fetch user: " + (err.response?.data?.message || err.message));
    }
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

  const validateForm = () => {
    if (!formData.email) {
      setError("Email is required");
      return false;
    }
    if (modalMode === "add" && !formData.password) {
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
        } else if (key !== "password" || (key === "password" && formData.password)) {
          data.append(key, formData[key] || "");
        }
      });

      let response;
      if (modalMode === "add") {
        response = await addUser(data);
      } else {
        response = await updateUserById(editUserId, data);
      }
      if (response.data.success) {
        closeModal();
        fetchUsers();
      } else {
        setError(response.data.message || "Failed to save user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save user");
      console.error("Save user error:", err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const response = await deleteUser(id);
      if (response.data.success) {
        fetchUsers();
      } else {
        setError(response.data.message || "Failed to delete user");
      }
    } catch (err) {
      setError("Failed to delete user: " + (err.message || "Unknown error"));
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">User Management</h1>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add User
        </button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={isActive}
          onChange={(e) => setIsActive(parseInt(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={-1}>All Status</option>
          <option value={1}>Active</option>
          <option value={0}>Inactive</option>
        </select>
      </div>
      {users.length === 0 ? (
        <p className="text-gray-500 text-center">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Email</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Full Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Phone Number</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Address</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Role</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Gender</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Active</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Updated At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id} className="border-b">
                  <td className="py-3 px-4">{user.user_id}</td>
                  <td className="py-3 px-4">{user.email}</td>
                  <td className="py-3 px-4">{user.full_name}</td>
                  <td className="py-3 px-4">{user.phone_number}</td>
                  <td className="py-3 px-4">{user.address}</td>
                  <td className="py-3 px-4">{user.role}</td>
                  <td className="py-3 px-4">{user.gender}</td>
                  <td className="py-3 px-4">{user.is_active ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{new Date(user.updated_at).toLocaleString()}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(user.user_id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(user.user_id)}
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
              {modalMode === "add" ? "Add New User" : "Edit User"}
            </h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {modalMode === "add" && (
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="user">User</option>
                  <option value="support">Support</option>
                  <option value="admin">Admin</option>
                  <option value="customizer">Customizer</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Address</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="4"
                />
              </div>
              <div className="mb-4">
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
                  {modalMode === "add" ? "Add User" : "Update User"}
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

export default UserManagement;
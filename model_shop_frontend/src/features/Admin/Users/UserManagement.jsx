// model_shop_frontend/src/features/Admin/Users/UserManagement.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";

const UserManagement = ({ user, roleFilter = "user" }) => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    user_id: 0,
    email: "",
    full_name: "",
    phone_number: "",
    address: "",
    role: "",
    gender: "",
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, [search, isActive, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search, role: roleFilter };
      if (isActive >= 0) params.is_active = isActive;
      const response = await api.get("/users/mana", { params });
      console.log('Users API Response:', response.data); // Log để debug
      if (response.data && response.data.status === "success" && Array.isArray(response.data.users)) {
        setUsers(response.data.users);
      } else {
        setUsers([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setUsers([]);
      setError(err.response?.data?.message || "An error occurred while fetching users");
      console.error('Users Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetEditForm = () => {
    setEditFormData({
      user_id: 0,
      email: "",
      full_name: "",
      phone_number: "",
      address: "",
      role: "",
      gender: "",
      is_active: true,
    });
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const response = await api.put(`/users/mana?id=${editFormData.user_id}`, editFormData);
      if (response.data.status === "success") {
        Toastify.success("User updated successfully");
        fetchUsers(); // Refresh list
        setIsEditModalOpen(false);
        resetEditForm();
      } else {
        setError(response.data.message || "Failed to update user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      setError("");
      const response = await api.delete(`/users/mana?id=${userId}`);
      if (response.data.status === "success") {
        Toastify.success("User deleted successfully");
        fetchUsers(); // Refresh list
      } else {
        setError(response.data.message || "Failed to delete user");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const openEditModal = (userData) => {
    setEditFormData({
      user_id: userData.user_id,
      email: userData.email,
      full_name: userData.full_name || "",
      phone_number: userData.phone_number || "",
      address: userData.address || "",
      role: userData.role,
      gender: userData.gender || "",
      is_active: userData.is_active,
    });
    setIsEditModalOpen(true);
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">User Management ({roleFilter === "user" ? "Users" : "Sellers"})</h1>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search users by email or name..."
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
          onChange={(e) => setIsActive(Number(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="-1">All Active Statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
      {users.length === 0 ? (
        <p className="text-gray-500 text-center">No users found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">User ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Email</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Full Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Phone</th>
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
                  <td className="py-3 px-4">{user.full_name || "N/A"}</td>
                  <td className="py-3 px-4">{user.phone_number || "N/A"}</td>
                  <td className="py-3 px-4">{user.address || "N/A"}</td>
                  <td className="py-3 px-4">{user.role}</td>
                  <td className="py-3 px-4">{user.gender || "N/A"}</td>
                  <td className="py-3 px-4">{user.is_active ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">{new Date(user.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{new Date(user.updated_at).toLocaleString()}</td>
                  <td className="py-3 px-4">
                    <button onClick={() => openEditModal(user)} className="text-blue-500 hover:text-blue-700 mr-2">
                      Edit
                    </button>
                    <button onClick={() => handleDeleteUser(user.user_id)} className="text-red-500 hover:text-red-700">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleEditChange}
                    required
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    value={editFormData.full_name}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={editFormData.phone_number}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    name="address"
                    value={editFormData.address}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Role</label>
                  <select
                    name="role"
                    value={editFormData.role}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                    <option value="customizer">Customizer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-700 mb-2">Gender</label>
                  <select
                    name="gender"
                    value={editFormData.gender}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={editFormData.is_active}
                  onChange={handleEditChange}
                  className="mr-2"
                />
                Active
              </label>
              <div className="flex gap-4">
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetEditForm();
                  }}
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
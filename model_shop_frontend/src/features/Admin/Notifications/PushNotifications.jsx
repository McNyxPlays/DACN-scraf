// model_shop_frontend/src/features/Admin/Notifications/PushNotifications.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";

const PushNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [isGlobal, setIsGlobal] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    message: "",
    type: "events",
    link: "",
    user_id: "",
    is_global: false,
  });

  useEffect(() => {
    fetchNotifications();
    fetchUsers();
  }, [search, isGlobal]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (isGlobal >= 0) params.is_global = isGlobal;
      const response = await api.get("/notifications", { params });
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setNotifications(response.data.data);
      } else {
        setNotifications([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setNotifications([]);
      setError(err.response?.data?.message || "An error occurred while fetching notifications");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await api.get("/users/mana");
      if (response.data.status === "success" && Array.isArray(response.data.data)) {
        setUsers(response.data.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
      setUsers([]);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError("");
      const payload = {
        message: formData.message,
        type: formData.type,
        link: formData.link,
        user_id: formData.is_global ? null : formData.user_id,
        is_global: formData.is_global,
      };
      const response = await api.post("/notifications/send", payload);
      if (response.data.status === "success") {
        Toastify.success(formData.is_global ? "Global notification sent successfully" : "Notification sent successfully");
        fetchNotifications();
        resetForm();
      } else {
        setError(response.data.message || "Failed to send notification");
      }
    } catch (err) {
      setError(err.response?.data?.message || "An error occurred");
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      message: "",
      type: "events",
      link: "",
      user_id: "",
      is_global: false,
    });
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Push Notifications</h1>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search notifications by message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={isGlobal}
          onChange={(e) => setIsGlobal(Number(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="-1">All Global Statuses</option>
          <option value="1">Global</option>
          <option value="0">Individual</option>
        </select>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Send New Notification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Message</label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
              rows="4"
            />
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="events">Events</option>
              <option value="promotions">Promotions</option>
              <option value="updates">Updates</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Link (Optional)</label>
            <input
              type="text"
              name="link"
              value={formData.link}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_global"
                checked={formData.is_global}
                onChange={handleChange}
                className="mr-2"
              />
              Send to All Users (Global)
            </label>
            {!formData.is_global && (
              <>
                <label className="block text-gray-700 mt-4 mb-2">Select User</label>
                <select
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  required={!formData.is_global}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select User</option>
                  {users.map((u) => (
                    <option key={u.user_id} value={u.user_id}>
                      {u.full_name} ({u.email})
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
        <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark">
          Send Notification
        </button>
      </form>

      {notifications.length === 0 ? (
        <p className="text-gray-500 text-center">No notifications found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Notification ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">User ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Message</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Global</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Read</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification) => (
                <tr key={notification.notification_id} className="border-b">
                  <td className="py-3 px-4">{notification.notification_id}</td>
                  <td className="py-3 px-4">{notification.user_id || "N/A"}</td>
                  <td className="py-3 px-4">{notification.message}</td>
                  <td className="py-3 px-4">{notification.is_global ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">{notification.is_read ? "Yes" : "No"}</td>
                  <td className="py-3 px-4">{new Date(notification.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PushNotifications;
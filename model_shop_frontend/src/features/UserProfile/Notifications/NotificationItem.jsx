import React from "react";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const NotificationItem = ({ notification, onMarkAsRead }) => {
  const handleMarkAsRead = async () => {
    if (notification.read) return;
    try {
      const response = await api.post(
        "/notifications",
        { action: "markSingleAsRead", notification_id: notification.id },
        { withCredentials: true, headers: { "Content-Type": "application/json" } }
      );
      if (response.data.success) {
        onMarkAsRead(notification.id);
        Toastify.success("Notification marked as read");
      } else {
        Toastify.error(`Failed to mark as read: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Network error";
      Toastify.error(`Failed to mark as read: ${errorMessage}`);
      console.error("Error marking notification as read:", error);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-start gap-4 mb-2">
      <div className="flex-1">
        <h3 className="font-semibold">{notification.title}</h3>
        <p className="text-sm text-gray-500">{notification.time}</p>
        <p className="mt-2">{notification.description}</p>
      </div>
      {!notification.read && (
        <button
          onClick={handleMarkAsRead}
          className="px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600"
        >
          Mark as Read
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
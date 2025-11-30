import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../../api/index";
import NotificationsSidebar from "./NotificationsSidebar";
import NotificationsHeader from "./NotificationsHeader";
import NotificationItem from "./NotificationItem";
import NotificationsPagination from "./NotificationsPagination";
import { Toastify } from "../../../components/Toastify";

const Notifications = () => {
  const { user } = useOutletContext();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("Unread");
  const [category, setCategory] = useState("All Categories");
  const [sort, setSort] = useState("Newest First");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.user_id) {
        setError("Please log in to view notifications.");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/notifications", {
          params: { 
            filter: filter.toLowerCase(), // Backend mong 'all', 'unread', 'read'
            type: category === "All Categories" ? "all" : category.toLowerCase(), // Sửa: backend mong 'type', 'all' cho all
            page: currentPage,
            perPage: 10 // Thêm nếu backend dùng perPage (mặc định 10)
          },
          withCredentials: true,
        });
        if (response.data.success) {
          const formattedNotifications = response.data.notifications.map((n) => ({
            id: n.notification_id,
            title: n.type ? `${n.type.charAt(0).toUpperCase()}${n.type.slice(1)} Notification` : "Notification",
            time: new Date(n.created_at).toLocaleString(),
            description: n.content || "No description available", // Sửa: backend trả content (message AS content)
            read: n.is_read === 1,
          }));
          setNotifications(formattedNotifications);
          setTotalPages(response.data.totalPages || 1);
        } else {
          setError(`Failed to fetch notifications: ${response.data.error || "Unknown error"}`);
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || error.message || "Network error";
        setError(`Failed to fetch notifications: ${errorMessage}`);
        console.error("Error fetching notifications:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, [filter, category, currentPage, user]); // Xóa sort vì backend không hỗ trợ

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort) => {
    setSort(newSort);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  // Mark all as read – sửa endpoint đúng backend
  const handleMarkAsRead = async () => {
    try {
      const response = await api.post("/notifications/read", { notification_ids: "all" }, { withCredentials: true });
      if (response.data.success) {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
        Toastify.success("All notifications marked as read");
      } else {
        Toastify.error(`Failed to mark as read: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Network error";
      Toastify.error(`Failed to mark as read: ${errorMessage}`);
      console.error("Error marking all as read:", error);
    }
  };

  // Delete all – backend chưa có, giả sử thêm route tương tự, nếu không thì comment
  const handleDelete = async () => {
    try {
      const response = await api.post("/notifications/delete", { notification_ids: "all" }, { withCredentials: true }); // Giả sử backend có route delete
      if (response.data.success) {
        setNotifications([]);
        setCurrentPage(1);
        Toastify.success("All notifications deleted");
      } else {
        Toastify.error(`Failed to delete: ${response.data.error || "Unknown error"}`);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || "Network error";
      Toastify.error(`Failed to delete: ${errorMessage}`);
      console.error("Error deleting notifications:", error);
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
      <NotificationsSidebar
        filter={filter}
        category={category}
        onFilterChange={handleFilterChange}
        onCategoryChange={handleCategoryChange}
      />
      <div className="flex-1">
        <NotificationsHeader
          sort={sort}
          onSortChange={handleSortChange}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDelete}
        />
        {loading ? (
          <div className="text-center py-4">Loading...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">{error}</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-4">No notifications found.</div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={(id) => setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))}
              />
            ))}
          </div>
        )}
        <NotificationsPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default Notifications;
// src/components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../redux/userSlice";
import { fetchCartCount } from "../redux/cartSlice";
import { 
  fetchNotificationsDropdown, 
  updateNotificationCount, 
  setDropdownList, 
  clearNotifications 
} from "../redux/notificationSlice";
import { useNotificationSocket } from "../hooks/useNotificationSocket"; // Quan trọng: realtime
import { useSession } from "../context/SessionContext";
import Swal from "sweetalert2";
import api from "../api/index";

const Header = ({ setIsLoginModalOpen, isCartOpen, setIsCartOpen }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const user = useSelector((state) => state.user.user);
  const cartCount = useSelector((state) => state.cart.count);
  // Lấy từ Redux thay vì local state
  const { count: notificationCount, dropdownList: notificationsDropdown } = useSelector(
    (state) => state.notifications
  );
  const userLoading = useSelector((state) => state.user.loading);

  const { sessionKey } = useSession();

  // BẮT BUỘC: Kích hoạt socket để nhận thông báo realtime
  useNotificationSocket();

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  // Toggle dropdown thông báo + load danh sách nếu chưa có
  const toggleNotification = () => {
    setIsNotificationOpen((prev) => !prev);

    // Chỉ fetch khi mở lần đầu và chưa có dữ liệu
    if (!isNotificationOpen && notificationsDropdown.length === 0) {
      const params = user?.user_id 
        ? { user_id: user.user_id } 
        : { session_key: sessionKey };
      dispatch(fetchNotificationsDropdown(params));
    }
  };

  // Mark all as read – cập nhật cả backend + Redux
  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/read", { notification_ids: "all" });
      dispatch(updateNotificationCount(0));
      dispatch(setDropdownList(notificationsDropdown.map(n => ({ ...n, is_read: 1 }))));
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  // Logout – thêm clear thông báo
  const handleLogout = async () => {
    const result = await Swal.fire({
      title: "Logout",
      text: "Are you sure you want to log out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, log out!",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      try {
        await dispatch(logoutUser()).unwrap();
        localStorage.removeItem("user");
        localStorage.removeItem("guest_session_key");
        localStorage.removeItem("guest_cart");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        window.dispatchEvent(new CustomEvent("userLoggedOut"));
        dispatch(clearNotifications()); // Xóa badge + list khi logout
        navigate("/");
        Swal.fire({
          title: "Logged out successfully!",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        console.error("Logout error:", err);
        Swal.fire({
          title: "Error",
          text: "Logout failed. Please try again.",
          icon: "error",
        });
      } finally {
        setIsDropdownOpen(false);
      }
    }
  };

  // Cập nhật số lượng giỏ hàng (giữ nguyên logic cũ)
  useEffect(() => {
    const fetchCount = () => {
      if (userLoading) return;
      const params = user?.user_id
        ? { user_id: user.user_id }
        : { session_key: sessionKey };
      dispatch(fetchCartCount(params));
    };
    fetchCount();
    const handleCartUpdate = () => fetchCount();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [dispatch, user?.user_id, sessionKey, userLoading]);

  // Đóng dropdown khi click ngoài (giữ nguyên)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* LEFT: Logo + Nav – giữ nguyên 100% */}
        <div className="flex items-center gap-12">
          <NavLink to="/" className="text-3xl font-['Pacifico'] text-primary">
            Scraptify
          </NavLink>
          <nav className="hidden md:flex items-center space-x-8">
            <NavLink to="/" className={({ isActive }) => `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`}>Home</NavLink>
            <NavLink to="/shop" className={({ isActive }) => `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`}>Shop</NavLink>
            <NavLink to="/community" className={({ isActive }) => `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`}>Community</NavLink>
          </nav>
        </div>

        {/* RIGHT: Icons – giữ nguyên giao diện, chỉ sửa logic thông báo */}
        <div className="flex items-center gap-4">

          {/* Cart – giữ nguyên */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative text-gray-600 hover:text-primary transition"
          >
            <i className="ri-shopping-cart-line ri-lg"></i>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {/* Order Status – giữ nguyên */}
          <NavLink to="/orderstatus" className="text-gray-600 hover:text-primary">
            <i className="ri-file-search-line ri-lg"></i>
          </NavLink>

          {/* Notification – chỉ sửa logic, giao diện giữ nguyên */}
          <div ref={notificationRef} className="relative">
            <button
              onClick={toggleNotification}
              className="relative text-gray-600 hover:text-primary transition"
            >
              <i className="ri-notification-3-line ri-lg"></i>
              {notificationCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </button>

            {/* Dropdown thông báo – giữ nguyên giao diện, chỉ dùng notificationsDropdown từ Redux */}
            {isNotificationOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border overflow-hidden z-50 max-h-96 overflow-y-auto">
                <div className="flex justify-between px-4 py-2 bg-gray-100">
                  <button onClick={handleMarkAllRead} className="text-blue-600 hover:underline text-sm">
                    Mark all as read
                  </button>
                  {user?.user_id && (
                    <NavLink 
                      to="/notifications" 
                      onClick={() => setIsNotificationOpen(false)} 
                      className="text-blue-600 hover:underline text-sm"
                    >
                      See more
                    </NavLink>
                  )}
                </div>

                {notificationsDropdown.length === 0 ? (
                  <p className="px-4 py-3 text-gray-500">No notifications</p>
                ) : (
                  notificationsDropdown.map((n) => (
                    <div 
                      key={n.notification_id} 
                      className={`px-4 py-3 hover:bg-gray-50 border-b ${n.is_read ? "text-gray-500" : "font-medium"}`}
                    >
                      <p className="text-sm">{n.message}</p>
                      <span className="text-xs text-gray-400 block">
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* User dropdown hoặc Sign In – giữ nguyên 100% */}
          {user?.user_id ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-2 text-gray-700 hover:text-primary transition"
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <i className="ri-user-line ri-lg"></i>
                )}
                <span className="text-sm font-medium hidden md:block">
                  {user.full_name?.split(' ')[0] || user.email?.split('@')[0] || "User"}
                </span>
                <i className="ri-arrow-down-s-line text-sm"></i>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border overflow-hidden z-50">
                  <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-user-line"></i> My Profile
                  </NavLink>
                  <NavLink to="/assets" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-store-line"></i> My assets
                  </NavLink>
                  <NavLink to="/orderhistory" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-file-list-3-line"></i> Order History
                  </NavLink>
                  <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-settings-3-line"></i> Settings
                  </NavLink>
                  <NavLink to="/messages" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-message-3-line"></i> Messages
                  </NavLink>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 text-left"
                  >
                    <i className="ri-logout-box-line"></i> Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center gap-1 text-gray-700 hover:text-primary transition"
            >
              <i className="ri-user-line ri-lg"></i>
              <span className="text-sm">Sign In</span>
            </button>
          )}

          {/* Admin Panel – giữ nguyên */}
          {user?.role === "admin" && (
            <NavLink to="/admin" className="text-gray-600 hover:text-primary ml-2" title="Admin Panel">
              <i className="ri-shield-user-line ri-lg"></i>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
// src/components/Header.jsx
import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logoutUser } from "../redux/userSlice";
import { fetchCartCount } from "../redux/cartSlice";
import { useSession } from "../context/SessionContext"; // ← Import

const Header = ({ setIsLoginModalOpen, isCartOpen, setIsCartOpen }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);

  const user = useSelector((state) => state.user.user);
  const cartCount = useSelector((state) => state.cart.count);
  const notificationCount = useSelector((state) => state.notifications.count);
  const userLoading = useSelector((state) => state.user.loading); // ← Added to skip fetches during validation

  const { sessionKey } = useSession(); // ← Lấy từ context

  const toggleDropdown = () => setIsDropdownOpen((prev) => !prev);

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      localStorage.removeItem("user");
      localStorage.removeItem("guest_session_key"); // ← XÓA (no transfer to guest; fresh guest after logout)
      localStorage.removeItem("guest_cart");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      window.dispatchEvent(new CustomEvent("userLoggedOut")); // ← Kích hoạt reset session
      navigate("/");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setIsDropdownOpen(false);
    }
  };

  // Lắng nghe cập nhật giỏ hàng
  useEffect(() => {
    const handleCartUpdate = () => {
      if (userLoading) return; // ← Skip if user validation is pending (prevents premature 401)
      if (user?.user_id) {
        dispatch(fetchCartCount({})); // ← Chỉ cần biết là user đã login
      } else {
        dispatch(fetchCartCount({ sessionKey }));
      }
    };

    handleCartUpdate(); // Gọi ngay lần đầu
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [dispatch, user, sessionKey, userLoading]); // ← Added userLoading dependency

  // Click ngoài dropdown
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* === LEFT: Logo + Nav (Desktop Only) === */}
        <div className="flex items-center gap-12">
          <NavLink to="/" className="text-3xl font-['Pacifico'] text-primary">
            Scraptify
          </NavLink>
          <nav className="flex items-center space-x-8">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/shop"
              className={({ isActive }) =>
                `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`
              }
            >
              Shop
            </NavLink>
            <NavLink
              to="/community"
              className={({ isActive }) =>
                `font-medium transition ${isActive ? "text-primary border-b-2 border-primary" : "text-gray-600 hover:text-primary"}`
              }
            >
              Community
            </NavLink>
          </nav>
        </div>

        {/* === RIGHT: Search → Cart → Track → Sign In (Desktop Only) === */}
        <div className="flex items-center gap-4">

          {/* 1. SEARCH BAR */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-56 pl-10 pr-4 py-2 rounded-full bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white text-sm transition"
            />
            <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500"></i>
          </div>

          {/* 2. CART */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative w-10 h-10 flex items-center justify-center text-gray-700 hover:bg-gray-100 rounded-full transition"
          >
            <i className="ri-shopping-cart-line ri-xl"></i>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          {/* 3. ORDER TRACKER */}
          <NavLink
            to="/orderstatus"
            className="flex items-center gap-1 text-gray-600 hover:text-primary transition"
            title="Check Order Status"
          >
            <i className="ri-truck-line ri-lg"></i>
            <span className="text-sm">Track</span>
          </NavLink>

          {/* 4. SIGN IN / USER MENU */}
          {user ? (
            <div ref={dropdownRef} className="relative">
              <button
                onClick={toggleDropdown}
                className="flex items-center gap-1 text-gray-700 hover:text-primary transition"
              >
                {user.profile_image ? (
                  <img src={user.profile_image} alt="Avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <i className="ri-user-line ri-lg"></i>
                )}
                <span className="text-sm font-medium">
                  {user.full_name?.split(' ')[0] || user.email?.split('@')[0] || "User"}
                </span>
                <i className="ri-arrow-down-s-line text-sm"></i>
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border overflow-hidden z-50">
                  <NavLink to="/profile" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-user-line"></i> My Profile
                  </NavLink>
                  <NavLink to="/mystore" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-store-line"></i> My Store
                  </NavLink>
                  <NavLink to="/orderhistory" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-file-list-3-line"></i> Order History
                  </NavLink>
                  <NavLink to="/settings" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50" onClick={toggleDropdown}>
                    <i className="ri-settings-3-line"></i> Settings
                  </NavLink>
                  <NavLink
                    to="/notifications"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 justify-between"
                    onClick={toggleDropdown}
                  >
                    <div className="flex items-center gap-3">
                      <i className="ri-notification-3-line"></i> Notifications
                    </div>
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                    )}
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

          {/* Admin Panel */}
          {user && user.role === "admin" && (
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
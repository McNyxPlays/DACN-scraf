// src/components/LoginModal/LoginModal.jsx
import { useState } from "react";
import api from "../../api/index";
import { useDispatch } from "react-redux";
import { updateUser } from "../../redux/userSlice";
import { fetchCartCount } from "../../redux/cartSlice";
import { Toastify } from "../Toastify";
import "./LoginModal.css";

const openEyeIcon = <i className="ri-eye-line text-gray-500"></i>;
const closedEyeIcon = <i className="ri-eye-off-line text-gray-500"></i>;

function LoginModal({ isOpen, setIsOpen, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const dispatch = useDispatch();

  const handleClose = () => {
    setIsOpen(false);
    setIsLogin(true);
    setError("");
    setSuccess("");
    setShowLoginPassword(false);
    setShowRegisterPassword(false);
    setShowConfirmPassword(false);
    setRememberMe(false);
    document.body.style.overflow = "auto";
  };

  // ==================== LOGIN ====================
  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setError("");
    const form = e.target;
    const email = form.elements.loginEmail.value.trim();
    const password = form.elements.loginPassword.value;

    if (!email || !password) {
      setError("Please fill in both email and password");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format");
      return;
    }

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
        remember_me: rememberMe,
      });

      const userData = response.data.user;

      dispatch(updateUser(userData));

      if (onLoginSuccess && typeof onLoginSuccess === "function") {
        await onLoginSuccess(userData);
      }

      dispatch(fetchCartCount({ userId: userData.user_id }));

      Toastify.success("Login successful!");
      handleClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
      Toastify.error(msg);
    }
  };

  // ==================== REGISTER ====================
  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    setError("");
    const form = e.target;
    const fullName = form.elements.fullName.value.trim();
    const email = form.elements.registerEmail.value.trim();
    const password = form.elements.registerPassword.value;
    const confirmPassword = form.elements.confirmPassword.value;

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    try {
      await api.post("/auth/register", { email, password, full_name: fullName });
      Toastify.success("Registration successful! Please log in.");
      setIsLogin(true);
      setSuccess("Account created! You can now log in.");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
      Toastify.error(msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-2xl text-gray-500 hover:text-gray-700 z-10"
        >
          ×
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-bold text-center mb-8">
            {isLogin ? "Sign In" : "Create Account"}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* ==================== LOGIN FORM ==================== */}
          {isLogin ? (
            <form onSubmit={handleSubmitLogin}>
              <div className="mb-5">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="loginEmail"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="mb-4 relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type={showLoginPassword ? "text" : "password"}
                  name="loginPassword"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6"
                >
                  {showLoginPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 font-medium rounded-lg hover:bg-primary/90 transition"
              >
                Sign In
              </button>
            </form>
          ) : (
            /* ==================== REGISTER FORM ==================== */
            <form onSubmit={handleSubmitRegister}>
              <div className="mb-5">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div className="mb-5">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="registerEmail"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="mb-4 relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  type={showRegisterPassword ? "text" : "password"}
                  name="registerPassword"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6"
                >
                  {showRegisterPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>

              <div className="mb-6 relative">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6"
                >
                  {showConfirmPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-primary text-white py-3.5 font-medium rounded-lg hover:bg-primary/90 transition"
              >
                Create Account
              </button>
            </form>
          )}

          <p className="text-center text-gray-600 mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setSuccess("");
              }}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginModal;
// src/components/LoginModal/LoginModal.jsx
import { useState, useEffect } from "react";
import api from "../../api/index";
import { useDispatch } from "react-redux";
import { updateUser } from "../../redux/userSlice";
import { fetchCartCount } from "../../redux/cartSlice";
import "./LoginModal.css";

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

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    const email = e.target.loginEmail.value.trim();
    const password = e.target.loginPassword.value;
    const remember_me = rememberMe;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email format.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

try {
      const response = await api.post("/login", { email, password, remember_me });
      const userData = response.data.user;

      localStorage.setItem("user", JSON.stringify(userData));
      dispatch(updateUser(userData));

      // Call onLoginSuccess for cart merge (from App.jsx)
      await onLoginSuccess(userData);

      // Dispatch fetchCartCount to update cart count after merge
      dispatch(fetchCartCount({ userId: userData.user_id }));

      // Trigger custom event for other listeners (e.g., Header)
      window.dispatchEvent(new CustomEvent("cartUpdated"));

      setSuccess(response.data.message);
      setError("");
      handleClose();
      // Removed window.location.reload() to prevent redirect
    } catch (err) {
      const msg = err.response?.data?.message || "Login failed. Please try again.";
      setError(msg);
      console.error("Login error:", err);
    }
  };

  const handleSubmitRegister = async (e) => {
    e.preventDefault();
    const email = e.target.registerEmail.value.trim();
    const password = e.target.registerPassword.value;
    const confirmPassword = e.target.confirmPassword.value;
    const full_name = e.target.fullName.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await api.post("/register", { email, password, full_name });
      setSuccess(response.data.message);
      setError("");
      setIsLogin(true); // Chuyển sang login
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed.";
      setError(msg);
    }
  };

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const openEyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 text-gray-500">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  const closedEyeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-5 h-5 text-gray-500">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.977 9.977 0 012.133-3.175m2.075-1.65A9.977 9.977 0 0112 5c4.478 0 8.268 2.943 9.542 7a9.977 9.977 0 01-2.133 3.175m-2.075 1.65a10.05 10.05 0 01-3.459 1.825m-1.875-1.825A3 3 0 0112 15a3 3 0 011.875 1.825m-1.875-1.825A3 3 0 0112 9a3 3 0 011.875 1.825" />
    </svg>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 relative shadow-2xl">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <i className="ri-close-line ri-xl"></i>
        </button>

        {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>}
        {success && <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">{success}</div>}

        {isLogin ? (
          <div>
            <h2 className="text-2xl font-bold text-center mb-6">Sign In</h2>
            <form onSubmit={handleSubmitLogin}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="loginEmail">Email</label>
                <input type="email" id="loginEmail" name="loginEmail" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Email" required />
              </div>
              <div className="mb-4 relative">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="loginPassword">Password</label>
                <input type={showLoginPassword ? "text" : "password"} id="loginPassword" name="loginPassword" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Password" required />
                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6">
                  {showLoginPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <label className="custom-checkbox">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                    <span className="checkmark"></span>
                  </label>
                  <span className="ml-2 text-sm text-gray-700">Remember me</span>
                </div>
                <a href="#" className="text-sm text-primary hover:underline">Forgot Password?</a>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-3 font-medium rounded-lg hover:bg-primary/90 transition">
                Sign In
              </button>
            </form>
            <p className="text-center text-gray-600 mt-6">
              Don't have an account?{" "}
              <button onClick={() => setIsLogin(false)} className="text-primary hover:underline">Sign Up</button>
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
            <form onSubmit={handleSubmitRegister}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="fullName">Full Name</label>
                <input type="text" id="fullName" name="fullName" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Full Name" required />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="registerEmail">Email</label>
                <input type="email" id="registerEmail" name="registerEmail" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Email" required />
              </div>
              <div className="mb-4 relative">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="registerPassword">Password</label>
                <input type={showRegisterPassword ? "text" : "password"} id="registerPassword" name="registerPassword" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Password" required />
                <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6">
                  {showRegisterPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>
              <div className="mb-4 relative">
                <label className="block text-gray-700 text-sm mb-2" htmlFor="confirmPassword">Confirm Password</label>
                <input type={showConfirmPassword ? "text" : "password"} id="confirmPassword" name="confirmPassword" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary" placeholder="Confirm Password" required />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6">
                  {showConfirmPassword ? closedEyeIcon : openEyeIcon}
                </button>
              </div>
              <div className="flex items-center mb-6">
                <label className="custom-checkbox">
                  <input type="checkbox" id="termsCheckbox" name="termsCheckbox" />
                  <span className="checkmark"></span>
                </label>
                <span className="ml-2 text-sm text-gray-700">
                  I agree to the <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>
                </span>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-3 font-medium rounded-lg hover:bg-primary/90 transition">
                Create Account
              </button>
            </form>
            <p className="text-center text-gray-600 mt-6">
              Already have an account?{" "}
              <button onClick={() => setIsLogin(true)} className="text-primary hover:underline">Sign In</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
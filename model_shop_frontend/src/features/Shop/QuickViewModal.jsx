// src/features/Shop/QuickViewModal.jsx
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../redux/userSlice";
import api from "../../api/index";
import ImageWithFallback from "../../components/ImageWithFallback";
import { Toastify } from "../../components/Toastify";

function QuickViewModal({ productId, isOpen, toggleModal }) {
  const dispatch = useDispatch();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const exchangeRate = 25000;
  const sessionKey =
    localStorage.getItem("guest_session_key") ||
    (() => {
      const newSessionKey = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guest_session_key", newSessionKey);
      return newSessionKey;
    })();
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  useEffect(() => {
    const validateUser = async () => {
      if (user && user.user_id) {
        try {
          const response = await api.get("/user");
          if (response.data.status === "success" && response.data.user) {
            setUser(response.data.user);
            localStorage.setItem("user", JSON.stringify(response.data.user));
          } else {
            throw new Error("Invalid user data");
          }
        } catch (err) {
          console.error("User validation error:", err);
          setUser(null);
          localStorage.removeItem("user");
          dispatch(logoutUser());
          Toastify.error("Session expired. Please login again.");
        }
      }
    };
    validateUser();
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (isOpen && productId) {
      const fetchProduct = async () => {
        setLoading(true);
        try {
          const response = await api.get("/products/product", {
            params: { id: productId }
          });
          if (response.data.status === "success") {
            setProduct(response.data.data);
            setError("");
          } else {
            const errorMsg = response.data.message || "Product not found";
            setError(errorMsg);
            Toastify.error(errorMsg);
            setProduct(null);
          }
        } catch (err) {
          const errorMsg =
            err.response?.data?.message ||
            err.message ||
            "Network error. Please check your connection or server status.";
          setError(errorMsg);
          Toastify.error(errorMsg);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    } else {
      setProduct(null);
      setQuantity(1);
      setError("");
    }
  }, [productId, isOpen]);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => {
      const newQty = prev + delta;
      return newQty > 0 && newQty <= (product?.stock_quantity || 0) ? newQty : prev;
    });
  };

  // Helper để thêm guest cart vào localStorage
  const addToLocalGuestCart = (productId, qty) => {
    let localCart = JSON.parse(localStorage.getItem('guest_cart') || '[]');
    const existing = localCart.find(item => item.product_id === productId);
    if (existing) {
      existing.quantity += qty;
    } else {
      localCart.push({ product_id: productId, quantity: qty });
    }
    localStorage.setItem('guest_cart', JSON.stringify(localCart));
  };

  const handleAddToCart = async () => {
    if (!product || product.stock_quantity < quantity) {
      Toastify.error("Insufficient stock or product unavailable.");
      return;
    }

    if (!user) {
      // Guest: Lưu vào localStorage (chỉ lưu khi thanh toán ở checkout)
      addToLocalGuestCart(product.product_id, quantity);
      Toastify.success("Đã thêm vào giỏ hàng thành công!");
      window.dispatchEvent(new CustomEvent("cartUpdated"));
      setTimeout(() => toggleModal(), 1500); // Delay để hiển thị toast
    } else {
      // User: Gọi API như cũ
      const endpoint = "/carts";
      const data = { product_id: product.product_id, quantity };

      try {
        const response = await api.post(endpoint, data);
        if (response.data.status === "success") {
          Toastify.success("Đã thêm vào giỏ hàng thành công!");
          window.dispatchEvent(new CustomEvent("cartUpdated"));
          setTimeout(() => toggleModal(), 1500); // Delay để hiển thị toast
        } else {
          Toastify.error(response.data.message || "Thêm vào giỏ hàng thất bại.");
        }
      } catch (err) {
        if (err.response?.status === 401) {
          dispatch(logoutUser());
          Toastify.error("Session expired. Please login again.");
        } else {
          Toastify.error(err.response?.data?.message || "Lỗi mạng hoặc máy chủ.");
        }
      }
    }
  };

  const handleAddToWishlist = async () => {
    if (!user || !user.user_id) {
      Toastify.error("Please log in to add to wishlist.");
      return;
    }
    try {
      const response = await api.post("/favorites", { product_id: product.product_id });
      if (response.data.status === "success") {
        Toastify.success("Added to wishlist!");
      } else {
        Toastify.error(response.data.message || "Failed to add to wishlist.");
      }
    } catch (err) {
      if (err.response?.status === 401) {
        dispatch(logoutUser());
        Toastify.error("Session expired. Please login again.");
      } else {
        Toastify.error(err.response?.data?.message || "Network error.");
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={toggleModal}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <i className="ri-close-line ri-xl"></i>
        </button>

        {loading ? (
          <div className="text-center py-8">Loading product...</div>
        ) : error ? (
          <p className="text-red-500 text-center">{error}</p>
        ) : product ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <ImageWithFallback
                  src={product.main_image ? `/Uploads/products/${product.main_image}` : "/placeholder-image.jpg"}
                  alt={product.name}
                  className="w-full h-96 object-cover rounded-lg"
                />
                <div className="grid grid-cols-4 gap-2">
                  {product.images?.map((img, index) => (
                    <ImageWithFallback
                      key={index}
                      src={`/Uploads/products/${img}`}
                      alt={`${product.name} thumbnail`}
                      className="w-full h-24 object-cover rounded-lg cursor-pointer"
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">{product.name}</h2>
                <p className="text-xl font-semibold">
                  {(product.price * exchangeRate).toLocaleString("vi-VN")} VND
                </p>
                <p className="text-gray-600">{product.description}</p>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Availability:</span>
                  <span
                    className={`${
                      product.stock_quantity > 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {product.stock_quantity > 0 ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border rounded-lg">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-l-lg"
                      disabled={quantity <= 1}
                    >
                      <i className="ri-subtract-line"></i>
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-r-lg"
                      disabled={product.stock_quantity <= 0 || quantity >= product.stock_quantity}
                    >
                      <i className="ri-add-line"></i>
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className={`flex-1 py-2 font-medium rounded-button transition flex items-center justify-center gap-2 ${
                      product.stock_quantity <= 0
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90"
                    }`}
                    disabled={product.stock_quantity <= 0}
                  >
                    <i className="ri-shopping-cart-line"></i>
                    Add to Cart
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleAddToWishlist}
                    className={`flex items-center gap-2 transition ${
                      user && user.user_id
                        ? "text-gray-700 hover:text-primary"
                        : "text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={!user || !user.user_id}
                    title={
                      user && user.user_id
                        ? "Add to Wishlist"
                        : "Log in to add to wishlist"
                    }
                  >
                    <i className="ri-heart-line"></i>
                    Add to Wishlist
                  </button>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <button className="flex items-center gap-2 text-gray-700 hover:text-primary transition">
                    <i className="ri-share-line"></i>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center">Product not available.</p>
        )}
      </div>
    </div>
  );
}

export default QuickViewModal;
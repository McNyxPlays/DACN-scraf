// src/features/Shop/QuickViewModal.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../../api/index";
import ImageWithFallback from "../../components/ImageWithFallback";
import { Toastify } from "../../components/Toastify";
import { formatCurrency } from "../../utils/formatCurrency";

function QuickViewModal({ productId, isOpen, toggleModal }) {
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [receiveNFT, setReceiveNFT] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const user = useSelector((state) => state.user.user);

  const sessionKey =
    localStorage.getItem("guest_session_key") ||
    (() => {
      const newSessionKey = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guest_session_key", newSessionKey);
      return newSessionKey;
    })();

  useEffect(() => {
    if (isOpen && productId) {
      const fetchProduct = async () => {
        setLoading(true);
        try {
          const response = await api.get(`/products/${productId}`);
          if (response.data.status === "success") {
            setProduct(response.data.product);
            setError("");
          } else {
            const errorMsg = response.data.message || "Unknown error";
            setError(errorMsg);
            Toastify.error(errorMsg);
          }
        } catch (err) {
          const errorMsg = err.response?.data?.message || err.message || "Network or server error";
          setError(errorMsg);
          Toastify.error(errorMsg);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [isOpen, productId]);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      const params = {
        product_id: productId,
        quantity,
        session_key: sessionKey,
        receive_nft: receiveNFT ? 1 : 0,
      };
      const response = await api.post("/cart", params);
      if (response.data.status === "success") {
        window.dispatchEvent(new CustomEvent("cartUpdated"));
        Toastify.success("Added to cart");
        toggleModal();
      } else {
        Toastify.error(response.data.message || "Failed to add to cart");
      }
    } catch (err) {
      Toastify.error(err.response?.data?.message || err.message || "Network error");
    }
  };

  const handleAddToWishlist = async () => {
    if (!user?.user_id || !productId) return;

    try {
      const response = await api.post("/favorites", { user_id: user.user_id, product_id: productId });
      if (response.data.status === "success") {
        window.dispatchEvent(new CustomEvent("favoritesUpdated"));
        Toastify.success("Added to wishlist");
      } else {
        Toastify.error(response.data.message || "Failed to add to wishlist");
      }
    } catch (err) {
      Toastify.error(err.response?.data?.message || err.message || "Network error");
    }
  };

  if (!isOpen) return null;

  // Giá gốc từ DB (giả sử lưu VND)
  const priceVND = product && product.price ? parseFloat(product.price) : 0;
  // Giá sau giảm (nếu có discount)
  const discountedPriceVND = product && product.discount > 0
    ? priceVND * (1 - product.discount / 100)
    : priceVND;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={toggleModal}
    >
      <div
        className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng modal (X) */}
        <button
          onClick={toggleModal}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-3xl font-bold"
          aria-label="Close modal"
        >
          ×
        </button>

        {loading && <div className="text-center py-12">Loading product...</div>}
        {error && <p className="text-red-500 text-center py-12">{error}</p>}

        {product && !loading && !error ? (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Phần hình ảnh */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <ImageWithFallback
                  src={product.main_image ? `/uploads/products/${product.main_image}` : "/placeholder.jpg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  fallback="/placeholder.jpg"
                />
              </div>
              {product.images?.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images
                    .filter((img) => !img.is_main)
                    .map((img, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden">
                        <ImageWithFallback
                          src={`/uploads/products/${img.image_url}`}
                          alt={`${product.name} thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                          fallback="/placeholder.jpg"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Phần thông tin sản phẩm */}
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">{product.name}</h2>

                {product.discount > 0 ? (
                  <div className="flex flex-col">
                    <span className="text-lg text-gray-500 line-through">
                      {formatCurrency(priceVND)}
                    </span>
                    <p className="text-2xl text-primary font-semibold">
                      {formatCurrency(discountedPriceVND)}
                      <span className="text-sm text-gray-500 ml-2">(-{product.discount}%)</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-2xl text-primary font-semibold">
                    {formatCurrency(priceVND)}
                  </p>
                )}
              </div>

              <p className="text-gray-600">{product.description || "No description available."}</p>

              <div className="space-y-2">
                <p className="font-medium">Brand: {product.brand_name}</p>
                <p className="font-medium">Category: {product.category_name}</p>
                <p className="font-medium">Stock: {product.stock_quantity}</p>
                {product.nft_id && (
                  <p className="font-medium text-blue-600">NFT Minted (ID: {product.nft_id})</p>
                )}
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => handleQuantityChange(-1)}
                    className="px-4 py-2 hover:bg-gray-50"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="px-4 py-2 min-w-[3rem] text-center">{quantity}</span>
                  <button
                    onClick={() => handleQuantityChange(1)}
                    className="px-4 py-2 hover:bg-gray-50"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 bg-primary text-white py-3 rounded-lg hover:bg-primary-dark transition flex items-center justify-center gap-2"
                >
                  <i className="ri-shopping-cart-line"></i>
                  Add to Cart
                </button>
              </div>

              {user && user.user_id && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="receive-nft"
                    checked={receiveNFT}
                    onChange={(e) => setReceiveNFT(e.target.checked)}
                  />
                  <label htmlFor="receive-nft" className="text-gray-700">Receive as NFT?</label>
                </div>
              )}

              <div className="flex items-center gap-4">
                <button
                  onClick={handleAddToWishlist}
                  className={`flex items-center gap-2 transition ${
                    user && user.user_id
                      ? "text-gray-700 hover:text-primary"
                      : "text-gray-400 cursor-not-allowed"
                  }`}
                  disabled={!user || !user.user_id}
                  title={user && user.user_id ? "Add to Wishlist" : "Log in to add to wishlist"}
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
        ) : (
          <p className="text-gray-500 text-center">Product not available.</p>
        )}
      </div>
    </div>
  );
}

export default QuickViewModal;
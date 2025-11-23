// src/features/Shop/ProductsGrid.jsx
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { logoutUser } from "../../redux/userSlice";
import api from "../../api/index";
import QuickViewModal from "./QuickViewModal";
import ImageWithFallback from "../../components/ImageWithFallback";
import { Toastify } from "../../components/Toastify";
import { useSelector } from "react-redux";

function ProductsGrid({ viewMode, filters, setFilters }) {
  const dispatch = useDispatch();
  const [sortOption, setSortOption] = useState("Popularity");
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_products: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickViewProductId, setQuickViewProductId] = useState(null);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const exchangeRate = 25000;
  const sessionKey =
    localStorage.getItem("guest_session_key") ||
    (() => {
      const newSessionKey = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem("guest_session_key", newSessionKey);
      return newSessionKey;
    })();
const user = useSelector((state) => state.user.user);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest("#sortDropdown")) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    fetchProducts();
  }, [filters, sortOption, currentPage]);

const fetchProducts = async () => {
    setLoading(true);
    try {
      const statuses = [];
      if (filters.status_new) statuses.push('new');
      if (filters.status_sale) statuses.push('sale');

      const params = {
        category_ids: filters.category_ids.length ? filters.category_ids.join(",") : undefined,
        brand_ids: filters.brand_ids.length ? filters.brand_ids.join(",") : undefined,
        status_new: filters.status_new ? "true" : undefined,
        status_sale: filters.status_sale ? "true" : undefined,
        status_available: filters.status_available ? "true" : undefined,
        search: filters.search || undefined,
        sort:
          sortOption === "Price: Low to High"
            ? "price_low"
            : sortOption === "Price: High to Low"
            ? "price_high"
            : sortOption === "Newest First"
            ? "newest"
            : "popularity",
        page: currentPage,
      };

      const response = await api.get("/products", { params });
      if (response.data.status === "success") {
        setProducts(response.data.data);
        setPagination(response.data.pagination);
        setError("");
      } else {
        const errorMsg = response.data.message || "Unknown error";
        setProducts([]);
        setError(`Failed to fetch products: ${errorMsg}`);
        Toastify.error(`Failed to fetch products: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Network or server error";
      setProducts([]);
      setError(`Failed to fetch products: ${errorMsg}`);
      Toastify.error(`Failed to fetch products: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSortSelect = (option) => {
    setSortOption(option);
    setIsSortOpen(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const toggleQuickView = (productId) => {
    setQuickViewProductId(productId);
    setIsQuickViewOpen(!isQuickViewOpen);
  };

  const handleRemoveCategory = (id) => {
    setFilters((prev) => ({
      ...prev,
      category_ids: prev.category_ids.filter((cid) => cid !== id),
    }));
  };

  const handleRemoveBrand = (id) => {
    setFilters((prev) => ({
      ...prev,
      brand_ids: prev.brand_ids.filter((bid) => bid !== id),
    }));
  };

  const handleAddToCart = async (productId) => {
    const data = { product_id: productId, quantity: 1 };
    if (!user?.user_id) {
      data.session_key = sessionKey;
    }

    try {
      const response = await api.post('/cart', data);
      if (response.data.status === "success") {
        Toastify.success("Added to cart!");
        window.dispatchEvent(new CustomEvent("cartUpdated"));
      } else {
        Toastify.error(response.data.message || "Failed to add to cart.");
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

  return (
    <div className="flex-1">
      {loading ? (
        <p className="text-center py-8 text-gray-500">Loading products...</p>
      ) : error ? (
        <p className="text-red-500 text-center py-8">{error}</p>
      ) : (
        <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-4" : "grid-cols-1"}`}>
          {products.map((product) => (
            <div
              key={product.product_id}
              className={`group bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow ${
                viewMode === "list" ? "flex" : ""
              } ${product.stock_quantity <= 0 ? "opacity-50" : ""}`}
            >
              <div className={`relative ${viewMode === "list" ? "w-48 h-48 flex-shrink-0" : "h-64"}`}>
                <ImageWithFallback
                  src={product.main_image ? `/Uploads/products/${product.main_image}` : "/placeholder-image.jpg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                {product.discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    -{Number(product.discount).toFixed(0)}%
                  </span>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity"></div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full group-hover:translate-y-0 transition-transform flex gap-2 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => toggleQuickView(product.product_id)}
                    className="bg-white text-gray-900 px-4 py-2 rounded-lg font-medium transform -translate-y-2 group-hover:translate-y-0 transition-transform rounded-button"
                  >
                    Quick View
                  </button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
                <p className="text-gray-500 text-sm mb-3">
                  {product.description}
                </p>
                <div className="flex items-center justify-between">
                  {product.discount > 0 ? (
                    <>
                      <span className="text-sm text-gray-900 line-through mr-2">
                        {(product.price * exchangeRate).toLocaleString("vi-VN")} VND
                      </span>
                      <span className="font-bold text-gray-900 text-lg">
                        {(product.discounted_price * exchangeRate).toLocaleString(
                          "vi-VN"
                        )}{" "}
                        VND
                      </span>
                    </>
                  ) : (
                    <span className="font-bold text-gray-900 text-lg">
                      {(product.price * exchangeRate).toLocaleString("vi-VN")} VND
                    </span>
                  )}
                  {product.stock_quantity > 0 && (
                    <button
                      onClick={() => handleAddToCart(product.product_id)}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-700 rounded-full hover:bg-primary hover:text-white transition rounded-button"
                    >
                      <i className="ri-shopping-cart-line"></i>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-10 flex justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <i className="ri-arrow-left-s-line"></i>
          </button>
          {Array.from(
            { length: Math.min(pagination.total_pages, 5) },
            (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full ${
                    page === currentPage
                      ? "bg-primary text-white"
                      : "border border-gray-300 text-gray-700 hover:bg-gray-100"
                  } transition`}
                >
                  {page}
                </button>
              );
            }
          )}
          {pagination.total_pages > 5 && (
            <span className="w-10 h-10 flex items-center justify-center text-gray-500">
              ...
            </span>
          )}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.total_pages}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <i className="ri-arrow-right-s-line"></i>
          </button>
        </div>
      </div>
      <QuickViewModal
        productId={quickViewProductId}
        isOpen={isQuickViewOpen}
        toggleModal={() => toggleQuickView(null)}
      />
    </div>
  );
}

export default ProductsGrid;
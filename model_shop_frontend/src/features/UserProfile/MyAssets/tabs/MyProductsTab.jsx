// src/features/UserProfile/MyAssets/tabs/MyProductsTab.jsx
import React, { useState, useEffect } from "react";
import api from "../../../../api";
import AssetItem from "../components/AssetItem";

function MyProductsTab({ userId }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/user/products", { params: { user_id: userId } })
      .then(res => {
        if (res.data.status === "success") {
          setProducts(res.data.products || []);
        }
      })
      .catch(() => Toastify.error("Failed to load products"))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggle = async (productId, currentStatus) => {
    try {
      await api.patch(`/products/${productId}/toggle`, { is_available: !currentStatus });
      setProducts(prev => prev.map(p => p.product_id === productId ? { ...p, is_available: !currentStatus } : p));
      Toastify.success("Status updated successfully");
    } catch {
      Toastify.error("Update error");
    }
  };

  if (loading) return <div className="text-center py-12">Loading...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {products.map(product => (
        <div key={product.product_id} className="relative">
          <AssetItem item={product} type="product" onEdit={() => window.location.href = `/admin/products/edit/${product.product_id}`} />
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => handleToggle(product.product_id, product.is_available)}
              className={`flex-1 py-2 rounded-lg text-white ${product.is_available ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            >
              {product.is_available ? "Ẩn sản phẩm" : "Hiển thị lại"}
            </button>
          </div>
        </div>
      ))}
      {products.length === 0 && <p className="col-span-full text-center text-gray-500 py-12">No products for sale yet</p>}
    </div>
  );
}

export default MyProductsTab;
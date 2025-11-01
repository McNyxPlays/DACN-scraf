import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../api/index";
import { Toastify } from "../../../components/Toastify";

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState(0);
  const [filterBrand, setFilterBrand] = useState(0);
  const [filterStatus, setFilterStatus] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    product_id: 0,
    name: "",
    category_id: 0,
    brand_id: 0,
    price: "",
    discount: 0,
    stock_quantity: 0,
    description: "",
    status: "new",
    primary_image_index: -1,
  });
  const [images, setImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
  }, [search, filterCategory, filterBrand, filterStatus]);

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams({
        search,
        category_id: filterCategory,
        brand_id: filterBrand,
        status: filterStatus,
      }).toString();
      const response = await api.get(`/products?${params}`);
      if (response.data.success) {
        setProducts(response.data.data || []);
      } else {
        setError(response.data.error || "Failed to fetch products");
      }
    } catch (err) {
      setError("Failed to fetch products: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      if (response.data.status === "success") {
        setCategories(response.data.data || []);
      } else {
        setError("Failed to fetch categories");
      }
    } catch (err) {
      setError("Failed to fetch categories: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await api.get("/brands");
      if (response.data.status === "success") {
        setBrands(response.data.data || []);
      } else {
        setError("Failed to fetch brands");
      }
    } catch (err) {
      setError("Failed to fetch brands: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const openAddModal = () => {
    setIsAddModalOpen(true);
    resetForm();
  };

  const openEditModal = async (productId) => {
    try {
      const response = await api.get(`/products?id=${productId}`);
      if (response.data.success && response.data.data.length > 0) {
        const product = response.data.data[0];
        setFormData({
          product_id: product.product_id,
          name: product.name,
          category_id: product.category_id,
          brand_id: product.brand_id,
          price: product.price,
          discount: product.discount,
          stock_quantity: product.stock_quantity,
          description: product.description,
          status: product.status,
          primary_image_index: -1,
        });
        setExistingImages(product.images || []);
        setImages([]);
        setIsEditModalOpen(true);
      } else {
        setError("Product not found");
      }
    } catch (err) {
      setError("Failed to fetch product: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: 0,
      name: "",
      category_id: 0,
      brand_id: 0,
      price: "",
      discount: 0,
      stock_quantity: 0,
      description: "",
      status: "new",
      primary_image_index: -1,
    });
    setImages([]);
    setExistingImages([]);
    setError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === "stock_quantity" || name === "primary_image_index" ? parseInt(value) : value,
    });
  };

  const handleImageChange = (e) => {
    const files = e.target.files;
    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSize = 5 * 1024 * 1024;
    let errorMsg = "";
    const newImages = Array.from(files).filter((file) => {
      if (!validImageTypes.includes(file.type)) {
        errorMsg = "Invalid file type. Only JPEG, PNG, GIF, WEBP allowed.";
        return false;
      }
      if (file.size > maxSize) {
        errorMsg = "File too large. Max size 5MB.";
        return false;
      }
      return true;
    });
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    setImages((prev) => [...prev, ...newImages]);
    setFormData({ ...formData, primary_image_index: existingImages.length });
  };

  const handlePrimaryImageSelect = (index) => {
    setFormData({ ...formData, primary_image_index: index });
  };

  const handleRemoveImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveExistingImage = async (imageId) => {
    try {
      const response = await api.delete(`/products-images?id=${imageId}`);
      if (response.data.success) {
        setExistingImages((prev) => prev.filter((img) => img.image_id !== imageId));
        Toastify.success("Image removed successfully");
      } else {
        setError(response.data.message || "Failed to remove image");
      }
    } catch (err) {
      setError("Failed to remove image: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.discount < 0 || formData.discount > 100) {
      setError("Discount must be between 0 and 100");
      return;
    }
    if (formData.primary_image_index === -1 && images.length > 0) {
      setFormData({ ...formData, primary_image_index: 0 });
    }
    const requestData = new FormData();
    Object.keys(formData).forEach((key) => {
      requestData.append(key, formData[key]);
    });
    images.forEach((image, index) => {
      requestData.append(`images[${index}]`, image);
    });
    try {
      const response = await api.post("/products", requestData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setIsAddModalOpen(false);
        resetForm();
        fetchProducts();
      } else {
        setError(response.data.message || "Failed to add product");
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to add product");
      }
      console.error(err);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (formData.discount < 0 || formData.discount > 100) {
      setError("Discount must be between 0 and 100");
      return;
    }
    if (formData.primary_image_index === -1 && images.length > 0) {
      setFormData({ ...formData, primary_image_index: 0 });
    }
    const requestData = new FormData();
    Object.keys(formData).forEach((key) => {
      requestData.append(key, formData[key]);
    });
    images.forEach((image, index) => {
      requestData.append(`images[${index}]`, image);
    });
    try {
      const response = await api.put(`/products?id=${formData.product_id}`, requestData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setIsEditModalOpen(false);
        resetForm();
        fetchProducts();
      } else {
        setError(response.data.message || "Failed to update product");
      }
    } catch (err) {
      if (err.response && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError("Failed to update product");
      }
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const response = await api.delete(`/products?id=${id}`);
      if (response.data.success) {
        fetchProducts();
      } else {
        setError(response.data.message || "Failed to delete product");
      }
    } catch (err) {
      setError("Failed to delete product: " + (err.message || "Unknown error"));
      console.error(err);
    }
  };

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Product Management</h1>
        <button
          onClick={openAddModal}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
        >
          Add Product
        </button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(parseInt(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={0}>All Categories</option>
          {categories.map((category) => (
            <option key={category.category_id} value={category.category_id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(parseInt(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value={0}>All Brands</option>
          {brands.map((brand) => (
            <option key={brand.brand_id} value={brand.brand_id}>
              {brand.name}
            </option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="available">Available</option>
          <option value="sale">Sale</option>
        </select>
      </div>
      {products.length === 0 ? (
        <p className="text-gray-500 text-center">No products found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Name</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Category</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Brand</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Price</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Discount</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Stock</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Status</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Created At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Updated At</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.product_id} className="border-b">
                  <td className="py-3 px-4">{product.product_id}</td>
                  <td className="py-3 px-4">{product.name}</td>
                  <td className="py-3 px-4">{product.category_name}</td>
                  <td className="py-3 px-4">{product.brand_name}</td>
                  <td className="py-3 px-4">{product.price}</td>
                  <td className="py-3 px-4">{product.discount}%</td>
                  <td className="py-3 px-4">{product.stock_quantity}</td>
                  <td className="py-3 px-4">{product.status}</td>
                  <td className="py-3 px-4">{new Date(product.created_at).toLocaleString()}</td>
                  <td className="py-3 px-4">{new Date(product.updated_at).toLocaleString()}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <button
                      onClick={() => openEditModal(product.product_id)}
                      className="bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.product_id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-lg hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Add New Product</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Brand</label>
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="4"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="new">New</option>
                  <option value="available">Available</option>
                  <option value="sale">Sale</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {images.length > 0 && (
                  <div className="mt-2 overflow-x-auto flex gap-2">
                    {images.slice(0, 4).map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(img)}
                          alt={`Preview ${index}`}
                          className={`w-20 h-20 object-cover rounded-lg border-2 ${
                            formData.primary_image_index === index
                              ? "border-primary"
                              : "border-gray-200"
                          }`}
                          onClick={() => handlePrimaryImageSelect(index)}
                        />
                      </div>
                    ))}
                    {images.length > 4 && (
                      <span className="text-gray-500">+{images.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Add Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    resetForm();
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Brand</label>
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Stock Quantity</label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                  rows="4"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="new">New</option>
                  <option value="available">Available</option>
                  <option value="sale">Sale</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Upload New Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {images.length > 0 && (
                  <div className="mt-2 overflow-x-auto flex gap-2">
                    {images.slice(0, 4).map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(img)}
                          alt={`Preview ${index}`}
                          className={`w-20 h-20 object-cover rounded-lg border-2 ${
                            formData.primary_image_index === index
                              ? "border-primary"
                              : "border-gray-200"
                          }`}
                          onClick={() => handlePrimaryImageSelect(index)}
                        />
                      </div>
                    ))}
                    {images.length > 4 && (
                      <span className="text-gray-500">+{images.length - 4} more</span>
                    )}
                  </div>
                )}
              </div>
              {existingImages.length > 0 && (
                <div>
                  <label className="block text-gray-700 mb-2">Existing Images</label>
                  <div className="mt-2 overflow-x-auto flex gap-2">
                    {existingImages.slice(0, 4).map((img, index) => (
                      <div key={img.image_id} className="relative">
                        <img
                          src={`/Uploads/products/${img.image_url}`}
                          alt={`Existing ${index}`}
                          className={`w-20 h-20 object-cover rounded-lg border-2 ${
                            img.is_main ? "border-primary" : "border-gray-200"
                          }`}
                        />
                        <button
                          onClick={() => handleRemoveExistingImage(img.image_id)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                          <i className="ri-close-line"></i>
                        </button>
                      </div>
                    ))}
                    {existingImages.length > 4 && (
                      <span className="text-gray-500">+{existingImages.length - 4} more</span>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark"
                >
                  Update Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
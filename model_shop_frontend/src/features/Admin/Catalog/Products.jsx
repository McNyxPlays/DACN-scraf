// model_shop_frontend/src/features/Admin/Catalog/Products.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../api/index';
import { Toastify } from '../../../components/Toastify';
import SelectableAssetItem from "../components/SelectableAssetItem";

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [nftList, setNftList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(0);
  const [filterBrand, setFilterBrand] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');

  // Add/Edit Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: 0,
    name: '',
    category_id: 0,
    brand_id: 0,
    price: '',
    discount: 0,
    stock_quantity: 0,
    description: '',
    status: 'new',
    nft_id: null,
  });
  const [images, setImages] = useState([]); // New images to upload
  const [existingImages, setExistingImages] = useState([]); // Existing images
  const [removeImageIds, setRemoveImageIds] = useState([]); // Images to remove

  // NFT Selection Modal
  const [isNftModalOpen, setIsNftModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchBrands();
    fetchNftList();
  }, [search, filterCategory, filterBrand, filterStatus]);

  const fetchNftList = async () => {
    try {
      const res = await api.get('/users/nft');
      if (res.data.success) {
        setNftList(res.data.data || []);
      } else {
        setNftList([]);
        Toastify.error(res.data.message || 'Failed to load NFTs');
      }
    } catch (err) {
      console.error('Failed to fetch NFTs:', err);
      setNftList([]);
      if (err.response?.status === 401) {
        Toastify.error('Please log in to view NFTs');
      } else {
        Toastify.error('Error loading NFTs');
      }
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};

      if (search?.trim()) params.search = search.trim();
      if (Number.isInteger(filterCategory) && filterCategory > 0) params.category_id = filterCategory;
      if (Number.isInteger(filterBrand) && filterBrand > 0) params.brand_id = filterBrand;
      if (filterStatus && typeof filterStatus === 'string' && filterStatus.trim()) params.status = filterStatus.trim();

      console.log('Request to /product/mana with parameters:', params);

      const res = await api.get('/product/mana', { params });

      if (res.data.status === 'success') {
        setProducts(res.data.data || []);
      } else {
        setError(res.data.message || 'Unable to load product list.');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred while loading data.';
      setError(errorMsg);
      console.error('fetchProducts error:', err);
      if (err.response) console.log('Server returned:', err.response.data);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/products/categories');
      if (res.data.status === 'success') {
        setCategories(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await api.get('/products/brands');
      if (res.data.status === 'success') {
        setBrands(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch brands:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      product_id: 0,
      name: '',
      category_id: 0,
      brand_id: 0,
      price: '',
      discount: 0,
      stock_quantity: 0,
      description: '',
      status: 'new',
      nft_id: null,
    });
    setImages([]);
    setExistingImages([]);
    setRemoveImageIds([]);
    setError('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    setImages([...e.target.files]);
  };

  const handleRemoveExistingImage = (imageId) => {
    setRemoveImageIds((prev) => [...prev, imageId]);
    setExistingImages((prev) => prev.filter((img) => img.image_id !== imageId));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Product name is required.');
      return false;
    }
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setError('Valid price is required.');
      return false;
    }
    if (formData.discount < 0 || formData.discount > 100) {
      setError('Discount must be between 0 and 100.');
      return false;
    }
    if (formData.stock_quantity < 0) {
      setError('Stock quantity cannot be negative.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!isAddModalOpen && (!formData.product_id || formData.product_id <= 0) ) {
      setError('Invalid product ID. Please select a valid product.');
      Toastify.error('Invalid product ID');
      return;
    }
    if (!validateForm()) {
      Toastify.error('Please correct the form errors.');
      return;
    }
    try {
      const form = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null && value !== undefined) form.append(key, value);
      });
      images.forEach((file) => form.append('images', file));
      removeImageIds.forEach((id) => form.append('remove_images[]', id));

      let res;
      if (isAddModalOpen) {
        res = await api.post('/product/mana', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.put(`/product/mana?id=${formData.product_id}`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data.status === 'success') {
        Toastify.success(isAddModalOpen ? 'Product added successfully' : 'Product updated successfully');
        fetchProducts();
        isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
        resetForm();
      } else {
        setError(res.data.message || 'Save failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred while saving';
      setError(errorMsg);
      console.error('handleSubmit error:', err);
    }
  };

  const openAddModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const openEditModal = async (product) => {
    if (!product || !product.product_id || product.product_id <= 0) {
      Toastify.error('Invalid product selected');
      return;
    }
    try {
      const res = await api.get(`/product/mana?id=${product.product_id}`);
      if (res.data.status === 'success' && res.data.data && res.data.data.length > 0) {
        const fullProduct = res.data.data[0];
        setFormData({
          product_id: fullProduct.product_id,
          name: fullProduct.name,
          category_id: fullProduct.category_id || 0,
          brand_id: fullProduct.brand_id || 0,
          price: fullProduct.price,
          discount: fullProduct.discount,
          stock_quantity: fullProduct.stock_quantity,
          description: fullProduct.description || '',
          status: getStatusFromProduct(fullProduct),
          nft_id: fullProduct.nft_id || null,
        });
        setExistingImages(fullProduct.images || []);
        setImages([]);
        setRemoveImageIds([]);
        setIsEditModalOpen(true);
      } else {
        Toastify.error('Failed to load product details');
      }
    } catch (err) {
      console.error('Error loading product details:', err);
      Toastify.error('Error loading product details');
    }
  };

  const getStatusFromProduct = (product) => {
    if (product.is_new) return 'new';
    if (product.is_used) return 'used';
    if (product.is_custom) return 'custom';
    if (product.is_hot) return 'hot';
    if (!product.is_available) return 'unavailable';
    if (product.is_on_sale) return 'sale';
    return 'new';
  };

  const selectNft = (nft) => {
    setFormData((prev) => ({ ...prev, nft_id: nft.mint_id }));
    setIsNftModalOpen(false);
  };

  const removeNft = () => {
    setFormData((prev) => ({ ...prev, nft_id: null }));
  };

  const openNftModal = () => {
    setIsNftModalOpen(true);
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await api.delete(`/product/mana?id=${productId}`);
      if (res.data.status === 'success') {
        Toastify.success('Product deleted successfully');
        fetchProducts();
      } else {
        setError(res.data.message || 'Delete failed');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'An error occurred while deleting';
      setError(errorMsg);
      console.error('handleDelete error:', err);
    }
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Product Management</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

      <div className="mb-4 flex justify-between">
        <button onClick={openAddModal} className="bg-blue-500 text-white px-4 py-2 rounded">
          Add New Product
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="border p-2 rounded"
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(parseInt(e.target.value))}
          className="border p-2 rounded"
        >
          <option value={0}>All Categories</option>
          {categories.map((cat) => (
            <option key={cat.category_id} value={cat.category_id}>
              {cat.name}
            </option>
          ))}
        </select>
        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(parseInt(e.target.value))}
          className="border p-2 rounded"
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
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="custom">Custom</option>
          <option value="hot">Hot</option>
          <option value="unavailable">Unavailable</option>
          <option value="sale">On Sale</option>
        </select>
      </div>

      <table className="w-full border-collapse border">
        <thead>
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Stock</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.product_id}>
              <td className="border p-2">{product.name}</td>
              <td className="border p-2">{product.price}</td>
              <td className="border p-2">{product.stock_quantity}</td>
              <td className="border p-2">{getStatusFromProduct(product)}</td>
              <td className="border p-2">
                <button onClick={() => openEditModal(product)} className="text-blue-500 mr-2">
                  Edit
                </button>
                <button onClick={() => handleDelete(product.product_id)} className="text-red-500">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">{isAddModalOpen ? 'Add Product' : 'Edit Product'}</h2>
            {error && <p className="text-red-500 mb-4">{error}</p>}
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Category</label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={0}>Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium">Brand</label>
                <select
                  name="brand_id"
                  value={formData.brand_id}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value={0}>Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.brand_id} value={brand.brand_id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium">Price</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0.01"
                  step="0.01"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Discount (%)</label>
                <input
                  type="number"
                  name="discount"
                  value={formData.discount}
                  onChange={handleChange}
                  min="0"
                  max="100"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Stock Quantity</label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block mb-2 font-medium">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="custom">Custom</option>
                  <option value="hot">Hot</option>
                  <option value="unavailable">Unavailable</option>
                  <option value="sale">On Sale</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block mb-2 font-medium">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Assign NFT */}
              <div className="col-span-2 mb-6">
                <label className="block mb-2 font-medium">Assign NFT</label>
                <div className="flex items-center gap-4">
                  <span className="text-gray-700">
                    {formData.nft_id ? `NFT ID: ${formData.nft_id}` : 'No NFT assigned'}
                  </span>
                  <button
                    type="button"
                    onClick={openNftModal}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Select NFT
                  </button>
                  {formData.nft_id && (
                    <button
                      type="button"
                      onClick={removeNft}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Remove NFT
                    </button>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="col-span-2 mb-6">
                <label className="block mb-2 font-medium">Images (max 10)</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                {/* Existing Images */}
                {existingImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-600 mb-2">Existing Images:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {existingImages.map((img) => (
                        <div key={img.image_id} className="relative">
                          <img
                            src={`/uploads/products/${img.image_url}`}
                            alt="product"
                            className="w-full h-24 object-cover rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingImage(img.image_id)}
                            className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
                >
                  {isAddModalOpen ? 'Add Product' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    isAddModalOpen ? setIsAddModalOpen(false) : setIsEditModalOpen(false);
                    resetForm();
                  }}
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NFT Selection Modal */}
{isNftModalOpen && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Select NFT</h2>
      {nftList.length === 0 ? (
        <p className="text-center py-20 text-gray-500 text-xl">No NFTs available</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {nftList.map((nft) => (
            <SelectableAssetItem 
              key={nft.mint_id} 
              item={nft} 
              type="nft-created" 
              onSelect={selectNft} // Pass the select function
            />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsNftModalOpen(false)}
        className="mt-6 bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
      >
        Close
      </button>
    </div>
  </div>
)}
    </div>
  );
};

export default Products;
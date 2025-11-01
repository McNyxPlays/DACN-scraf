import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useOutletContext } from "react-router-dom";
import api from "../../api/index";
// import UserManagement from "./UserManagement/UserManagement";
// import AddUser from "./UserManagement/AddUser";
// import EditUser from "./UserManagement/EditUser";
// import ProductManagement from "./ProductManagement/ProductManagement";
// import AddProduct from "./ProductManagement/AddProduct";
// import EditProduct from "./ProductManagement/EditProduct";
// import CategoriesManagement from "./CategoriesManagement/CategoriesManagement";
// import AddCategories from "./CategoriesManagement/AddCategories";
// import EditCategories from "./CategoriesManagement/EditCategories";
// import BrandsManagement from "./BrandsManagement/BrandsManagement";
// import AddBrand from "./BrandsManagement/AddBrand";
// import EditBrand from "./BrandsManagement/EditBrand";
// import PromotionsManagement from "./PromotionsManagement/PromotionsManagement";
// import AddPromotions from "./PromotionsManagement/AddPromotions";
// import EditPromotions from "./PromotionsManagement/EditPromotions";
// import ErrorBoundary from "./ErrorBoundary";

const Admin = () => {
  const { user } = useOutletContext() || {};
  const [stats, setStats] = useState({
    users: 0,
    products: 0,
    categories: 0,
    brands: 0,
    promotions: 0,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get("/stats");
        if (response.data.status === "success") {
          setStats({
            users: response.data.data.users || 0,
            products: response.data.data.products || 0,
            categories: response.data.data.categories || 0,
            brands: response.data.data.brands || 0,
            promotions: response.data.data.promotions || 0,
          });
        } else {
          throw new Error(response.data.message || "Failed to fetch stats");
        }
      } catch (err) {
        setError("Failed to fetch dashboard stats");
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        {user && (
          <div className="text-right">
            <p className="text-gray-700 font-medium">
              {user.full_name || user.email || "User"}
            </p>
            <p className="text-gray-500 text-sm">
              Created:{" "}
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-4 mb-6">
        <NavLink
          to="/admin/products"
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          Product Management
        </NavLink>
        <NavLink
          to="/admin/users"
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          Account Management
        </NavLink>
        <NavLink
          to="/admin/categories"
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          Categories Management
        </NavLink>
        <NavLink
          to="/admin/brands"
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          Brands Management
        </NavLink>
        <NavLink
          to="/admin/promotions"
          className={({ isActive }) =>
            `px-4 py-2 rounded-lg ${
              isActive
                ? "bg-primary text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`
          }
        >
          Promotions Management
        </NavLink>
      </div>
      <Routes>
        <Route
          path="/"
          element={
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Dashboard Overview</h2>
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg font-medium">Total Users</p>
                  <p className="text-2xl">{stats.users}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg font-medium">Total Products</p>
                  <p className="text-2xl">{stats.products}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg font-medium">Total Categories</p>
                  <p className="text-2xl">{stats.categories}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg font-medium">Total Brands</p>
                  <p className="text-2xl">{stats.brands}</p>
                </div>
                <div className="p-4 bg-gray-100 rounded-lg">
                  <p className="text-lg font-medium">Total Promotions</p>
                  <p className="text-2xl">{stats.promotions}</p>
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="/users"
          element={
            <ErrorBoundary>
              <UserManagement user={user} />
            </ErrorBoundary>
          }
        />
        <Route path="/users/add" element={<AddUser />} />
        <Route path="/users/edit/:id" element={<EditUser />} />
        <Route path="/products" element={<ProductManagement />} />
        <Route path="/products/add" element={<AddProduct />} />
        <Route path="/products/edit/:id" element={<EditProduct />} />
        <Route path="/categories" element={<CategoriesManagement />} />
        <Route path="/categories/add" element={<AddCategories />} />
        <Route path="/categories/edit/:id" element={<EditCategories />} />
        <Route path="/brands" element={<BrandsManagement />} />
        <Route path="/brands/add" element={<AddBrand />} />
        <Route path="/brands/edit/:id" element={<EditBrand />} />
        <Route path="/promotions" element={<PromotionsManagement />} />
        <Route path="/promotions/add" element={<AddPromotions />} />
        <Route path="/promotions/edit/:id" element={<EditPromotions />} />
      </Routes>
    </div>
  );
};

export default Admin;
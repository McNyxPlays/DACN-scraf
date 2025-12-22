import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useOutletContext } from 'react-router-dom';
import api from '../../api/index';

import Products from './Catalog/Products';
import Categories from './Catalog/Categories';
import Brands from './Catalog/Brands';
import UserManagement from './Users/UserManagement';
import Promotions from './Marketing/Promotions';
import PushNotifications from './Notifications/PushNotifications';
import Orders from './Orders/Orders';
import NFTManagement from './Blockchain/NFTManagement';
import NFTTransactions from './Blockchain/NFTTransactions';
import Sales from './Reports/Sales';
import NFTReports from './Reports/NFTReports';
import ErrorBoundary from './ErrorBoundary';

const Admin = () => {
  const { user } = useOutletContext() || {};
  const [stats, setStats] = useState({
    users: 0,
    sellers: 0,
    products: 0,
    categories: 0,
    brands: 0,
    promotions: 0,
    orders: 0,
    notifications: 0,
    nfts: 0,
    transactions: 0,
    sales: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fetchWithError = async (url) => {
          try {
            const res = await api.get(url);
            return res.data.users || res.data.data || [];
          } catch (err) {
            console.error(`Error fetching ${url}:`, err);
            return [];
          }
        };

        const [
          usersData,
          sellersData,
          productsData,
          categoriesData,
          brandsData,
          promotionsData,
          ordersData,
          notificationsData,
          nftsData,
          transactionsData,
          salesData
        ] = await Promise.all([
          fetchWithError('/users/mana?role=user'),
          fetchWithError('/users/mana?role=customizer'),
          fetchWithError('/product/mana'),
          fetchWithError('/categories/mana'),
          fetchWithError('/brands/mana'),
          fetchWithError('/promotions/mana'),
          fetchWithError('/orders/mana'),
          fetchWithError('/notifications'),
          fetchWithError('/users/nft'),
          fetchWithError('/order-nft-mints'),
          fetchWithError('/reports/sales'), //chưa sửa dụng
        ]);

        setStats({
          users: usersData.length,
          sellers: sellersData.length,
          products: productsData.length,
          categories: categoriesData.length,
          brands: brandsData.length,
          promotions: promotionsData.length,
          orders: ordersData.length,
          notifications: notificationsData.length,
          nfts: nftsData.length,
          transactions: transactionsData.length,
          sales: salesData.total_sales || 0,
        });
      } catch (err) {
        setError("Failed to fetch stats: " + (err.message || "Unknown error"));
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar - Scroll riêng */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-8">Admin Panel</h2>
            <nav className="space-y-2">
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `block px-4 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                  }`
                }
              >
                Dashboard Overview
              </NavLink>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Catalog</h3>
                <NavLink
                  to="/admin/products"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Products
                </NavLink>
                <NavLink
                  to="/admin/categories"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Categories
                </NavLink>
                <NavLink
                  to="/admin/brands"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Brands
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Users</h3>
                <NavLink
                  to="/admin/users/users"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Users
                </NavLink>
                <NavLink
                  to="/admin/users/sellers"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Sellers
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Orders</h3>
                <NavLink
                  to="/admin/orders"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Orders
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Marketing</h3>
                <NavLink
                  to="/admin/marketing/promotions"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Promotions
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Notifications</h3>
                <NavLink
                  to="/admin/notifications/push"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Push Notifications
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Blockchain</h3>
                <NavLink
                  to="/admin/blockchain/nft-management"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  NFT Management
                </NavLink>
                <NavLink
                  to="/admin/blockchain/nft-transactions"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  NFT Transactions
                </NavLink>
              </div>

              <div className="pt-4">
                <h3 className="text-sm font-bold text-gray-600 px-4 mb-2">Reports</h3>
                <NavLink
                  to="/admin/reports/sales"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  Sales
                </NavLink>
                <NavLink
                  to="/admin/reports/nft-reports"
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-primary text-white' : 'hover:bg-gray-100'
                    }`
                  }
                >
                  NFT Reports
                </NavLink>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main content - Cuộn riêng */}
        <main className="flex-1 overflow-y-auto p-8">
          <Routes>
            <Route path="/" element={
              <ErrorBoundary>
                <div>
                  <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Users</p>
                      <p className="text-3xl font-bold text-primary">{stats.users}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Sellers</p>
                      <p className="text-3xl font-bold text-primary">{stats.sellers}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Products</p>
                      <p className="text-3xl font-bold text-primary">{stats.products}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Categories</p>
                      <p className="text-3xl font-bold text-primary">{stats.categories}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Brands</p>
                      <p className="text-3xl font-bold text-primary">{stats.brands}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Promotions</p>
                      <p className="text-3xl font-bold text-primary">{stats.promotions}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Orders</p>
                      <p className="text-3xl font-bold text-primary">{stats.orders}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Notifications</p>
                      <p className="text-3xl font-bold text-primary">{stats.notifications}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total NFTs</p>
                      <p className="text-3xl font-bold text-primary">{stats.nfts}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Transactions</p>
                      <p className="text-3xl font-bold text-primary">{stats.transactions}</p>
                    </div>
                    <div className="p-6 bg-white rounded-lg shadow">
                      <p className="text-lg font-medium text-gray-600">Total Sales</p>
                      <p className="text-3xl font-bold text-primary">${stats.sales.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>
            } />
            <Route path="/products" element={<ErrorBoundary><Products /></ErrorBoundary>} />
            <Route path="/categories" element={<ErrorBoundary><Categories /></ErrorBoundary>} />
            <Route path="/brands" element={<ErrorBoundary><Brands /></ErrorBoundary>} />
            <Route path="/users/users" element={<ErrorBoundary><UserManagement user={user} roleFilter="user" /></ErrorBoundary>} />
            <Route path="/users/sellers" element={<ErrorBoundary><UserManagement user={user} roleFilter="customizer" /></ErrorBoundary>} />
            <Route path="/orders" element={<ErrorBoundary><Orders /></ErrorBoundary>} />
            <Route path="/marketing/promotions" element={<ErrorBoundary><Promotions /></ErrorBoundary>} />
            <Route path="/notifications/push" element={<ErrorBoundary><PushNotifications /></ErrorBoundary>} />
            <Route path="/blockchain/nft-management" element={<ErrorBoundary><NFTManagement /></ErrorBoundary>} />
            <Route path="/blockchain/nft-transactions" element={<ErrorBoundary><NFTTransactions /></ErrorBoundary>} />
            <Route path="/reports/sales" element={<ErrorBoundary><Sales /></ErrorBoundary>} />
            <Route path="/reports/nft-reports" element={<ErrorBoundary><NFTReports /></ErrorBoundary>} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Admin;
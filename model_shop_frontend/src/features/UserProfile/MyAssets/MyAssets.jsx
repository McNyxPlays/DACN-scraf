// src/features/UserProfile/MyAssets/MyAssets.jsx
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Toastify } from "../../../components/Toastify";
import MyAssetsHeader from "./MyAssetsHeader";
import FavoritesTab from "./tabs/FavoritesTab";
import MyProductsTab from "./tabs/MyProductsTab";
import ReceivedNFTsTab from "./tabs/ReceivedNFTsTab";
import CreatedNFTsTab from "./tabs/CreatedNFTsTab";

const TABS = {
  favorites: "favorites",
  products: "products",
  received: "received",
  created: "created",
};

function MyAssets() {
  const user = useSelector((state) => state.user.user);
  const loadingUser = useSelector((state) => state.user.loading);

  const [activeTab, setActiveTab] = useState(TABS.favorites);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loadingUser && user?.user_id) {
      setIsLoading(false);
    } else if (!loadingUser && !user?.user_id) {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, [user, loadingUser]);

  if (!isLoading && !user?.user_id) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <i className="ri-emotion-sad-line text-6xl text-gray-300 mb-6"></i>
        <h1 className="text-4xl font-bold text-gray-800 mb-4">My Assets</h1>
        <p className="text-xl text-gray-600 mb-8">
          Please log in to manage your products, NFTs, and orders.
        </p>
        <button
          onClick={() => window.location.href = "/"}
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (isLoading || loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-4xl font-bold text-center mb-10 text-gray-900">
        My Assets
      </h1>

      <MyAssetsHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="mt-10">
        {activeTab === TABS.favorites && <FavoritesTab userId={user.user_id} />}
        {activeTab === TABS.products && <MyProductsTab userId={user.user_id} />}
        {activeTab === TABS.received && <ReceivedNFTsTab wallet={user.wallet_address} />}
        {activeTab === TABS.created && <CreatedNFTsTab userId={user.user_id} />}
      </div>
    </div>
  );
}

export default MyAssets;
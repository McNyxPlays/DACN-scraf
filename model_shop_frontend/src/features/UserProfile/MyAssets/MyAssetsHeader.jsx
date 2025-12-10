// src/features/UserProfile/MyAssets/MyAssetsHeader.jsx
import React from "react";

const tabs = [
  { key: "favorites", label: "Favorites", icon: "ri-heart-3-line" },
  { key: "products", label: "Products for Sale", icon: "ri-store-2-line" },
  { key: "received", label: "Received NFTs", icon: "ri-inbox-line" },
  { key: "created", label: "Created NFTs", icon: "ri-brush-line" },
];

function MyAssetsHeader({ activeTab, setActiveTab }) {
  return (
    <div className="border-b border-gray-200">
      <div className="flex overflow-x-auto scrollbar-hide -mb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <i className={`${tab.icon} text-xl`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default MyAssetsHeader;
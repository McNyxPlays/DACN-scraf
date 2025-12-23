// src/features/UserProfile/MyAssets/components/AssetItem.jsx
import React from "react";
import { formatCurrency } from "../../../../utils/formatCurrency"; 

function AssetItem({ item, type = "product", onRemove, onEdit }) {
  const isNFT = type.includes("nft");
  const isPurchased = type === "nft-purchased";

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
      <div className="relative h-64 bg-gray-100">
        <img
          src={item.image || item.nft_image_url || "/placeholder.jpg"}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {isPurchased && <span className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">Purchased</span>}
      </div>
      <div className="p-4">
        <h3 className="font-medium text-lg truncate">{item.name}</h3>
        {item.price && (
          <p className="text-gray-600 font-bold">
            {formatCurrency(item.price)} {/* ← sử dụng hàm đã import */}
          </p>
        )}
        <p className="text-sm text-gray-500 mt-1 truncate">
          {item.description || "No description available"}
        </p>
        {isNFT && item.token_id && (
          <p className="text-xs text-gray-500 mt-1">Token ID: {item.token_id}</p>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export default AssetItem;
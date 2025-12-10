
// src/features/UserProfile/MyAssets/components/AssetItem.jsx
import React from "react";
import { formatCurrency } from "../../../../utils/formatCurrency";

function AssetItem({ item, type = "product", onRemove, onEdit }) {
  const isNFT = type.includes("nft");

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group">
      <div className="relative h-64 bg-gray-100">
        <img
          src={item.image || item.nft_image_url || "/placeholder.jpg"}
          alt={item.name}
          className="w-full h-full object-cover"
        />
        {onRemove && (
          <button
            onClick={() => onRemove(item.saved_id || item.product_id)}
            className="absolute top-3 right-3 bg-white/80 backdrop-blur p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
          >
            <i className="ri-close-line text-xl text-red-600"></i>
          </button>
        )}
        {isNFT && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-medium">
            NFT
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-lg truncate">{item.name || `Token #${item.token_id}`}</h3>
        <p className="text-2xl font-bold text-blue-600 mt-2">
          {formatCurrency(item.price || 0)}
        </p>
        {isNFT && item.token_id && (
          <p className="text-xs text-gray-500 mt-1">Token ID: {item.token_id}</p>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(item)}
            className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Chỉnh sửa
          </button>
        )}
      </div>
    </div>
  );
}

export default AssetItem;
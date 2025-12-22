// src/features/Admin/Catalog/components/SelectableAssetItem.jsx
import React from "react";

function SelectableAssetItem({ item, type = "nft-created", onSelect }) {
  const isNFT = type.includes("nft");

  return (
    <div 
      className="bg-white rounded-xl shadow-sm hover:shadow-lg transition overflow-hidden group cursor-pointer"
      onClick={() => onSelect(item)} // Trigger selection
    >
      <div className="relative h-64 bg-gray-100">
        <img
          src={item.image || item.nft_image_url || "/placeholder.jpg"}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium text-lg truncate">{item.name}</h3>
        {isNFT && item.mint_id && (
          <p className="text-sm text-gray-500">ID: {item.mint_id}</p>
        )}
        {item.token_id && (
          <p className="text-xs text-gray-500">Token ID: {item.token_id}</p>
        )}
      </div>
    </div>
  );
}

export default SelectableAssetItem;
// model_shop_frontend/src/features/Admin/Blockchain/AdminNFTList.jsx
import React from "react";
import { Toastify } from "../../../components/Toastify";
import AssetItem from "../../UserProfile/MyAssets/components/AssetItem";

function AdminNFTList({ nfts, loading, error }) {
  if (loading) return <div className="text-center py-20 text-gray-500">Loading NFTs...</div>;

  if (error) {
    Toastify.error(error);
    return <p className="text-center py-20 text-gray-500 text-xl">Error loading NFTs.</p>;
  }

  return (
    <div className="p-6">
      {nfts.length === 0 ? (
        <p className="text-center py-20 text-gray-500 text-xl">No NFTs found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {nfts.map((nft) => (
            <AssetItem key={nft.mint_id} item={nft} type="nft-created" />
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminNFTList;
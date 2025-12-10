// src/features/UserProfile/MyAssets/tabs/MyCreatedNFTsList.jsx
import React, { useState, useEffect } from "react";
import api from "../../../../api";
import { Toastify } from "../../../../components/Toastify";
import AssetItem from "../components/AssetItem";

function MyCreatedNFTsList({ userId }) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMyNFTs = async () => {
    try {
      const res = await api.get("/user/nfts/created", { params: { user_id: userId } });
      if (res.data.status === "success") {
        setNfts(res.data.nfts || []);
      } else {
        Toastify.error(res.data.message || "Failed to fetch NFTs");
      }
    } catch (err) {
      Toastify.error(err.response?.data?.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchMyNFTs();
  }, [userId]);

  if (loading) return <div className="text-center py-20 text-gray-500">Loading your NFTs...</div>;

  return (
    <div className="p-6">
      {nfts.length === 0 ? (
        <p className="text-center py-20 text-gray-500 text-xl">No NFTs created yet. Start creating one!</p>
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

export default MyCreatedNFTsList;
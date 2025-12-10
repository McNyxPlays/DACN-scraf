// src/features/UserProfile/MyAssets/tabs/ReceivedNFTsTab.jsx
import React, { useState, useEffect } from "react";
import api from "../../../../api";
import { Toastify } from "../../../../components/Toastify";
import AssetItem from "../components/AssetItem";

function ReceivedNFTsTab({ wallet }) {
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      setError("Please connect wallet to view received NFTs");
      return;
    }

    const fetchReceivedNFTs = async () => {
      setLoading(true);
      try {
        const response = await api.get("/user/nfts/received", {
          params: { mint_address: wallet },
        });
        if (response.data.status === "success") {
          setNfts(response.data.nfts || []);
          setError("");
        } else {
          setError(response.data.message || "Unknown error");
          Toastify.error(response.data.message || "Unknown error");
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || "Network or server error";
        setError(errorMsg);
        Toastify.error(errorMsg);
        setNfts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivedNFTs();
  }, [wallet]);

  if (loading) {
    return <div className="text-center py-12">Loading received NFTs...</div>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-12">{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {nfts.length > 0 ? (
        nfts.map((nft) => (
          <AssetItem
            key={nft.mint_id}
            item={nft}
            type="nft-received"
          />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-500 py-12">No received NFTs yet</p>
      )}
    </div>
  );
}

export default ReceivedNFTsTab;
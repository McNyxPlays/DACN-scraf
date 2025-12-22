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
      setError("");
      try {
        const res = await api.get('/order-nft-mints?wallet=' + wallet);
        console.log('Received NFTs response:', res.data);

        if (res.data.success) {
          setNfts(res.data.data || []);
        } else {
          setError(res.data.message || 'Failed to load received NFTs');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Error loading received NFTs');
        console.error('fetchReceivedNFTs error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceivedNFTs();
  }, [wallet]);

  if (loading) return <p className="text-center py-12 text-gray-500">Loading received NFTs...</p>;
  if (error) return <p className="text-red-500 text-center py-12">{error}</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {nfts.length > 0 ? (
        nfts.map((nft) => (
          <AssetItem
            key={nft.mint_id}
            item={nft}
            type="nft-purchased" 
          />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-500 py-12">No received NFTs yet</p>
      )}
    </div>
  );
}

export default ReceivedNFTsTab;
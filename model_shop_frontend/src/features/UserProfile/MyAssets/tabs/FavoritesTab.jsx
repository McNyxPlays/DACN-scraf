// src/features/UserProfile/MyAssets/tabs/FavoritesTab.jsx
import React, { useState, useEffect } from "react";
import api from "../../../../api";
import { Toastify } from "../../../../components/Toastify";
import AssetItem from "../components/AssetItem";

function FavoritesTab({ userId }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const response = await api.get("/favorites", {
          params: { user_id: userId },
        });
        if (response.data.status === "success") {
          setFavorites(response.data.favorites || []);
          setError("");
        } else {
          setError(response.data.message || "Unknown error");
          Toastify.error(response.data.message || "Unknown error");
        }
      } catch (err) {
        const errorMsg = err.response?.data?.message || err.message || "Network or server error";
        setError(errorMsg);
        Toastify.error(errorMsg);
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    const handleFavoritesUpdate = () => {
      setTimeout(fetchFavorites, 500);
    };
    window.addEventListener("favoritesUpdated", handleFavoritesUpdate);
    return () => window.removeEventListener("favoritesUpdated", handleFavoritesUpdate);
  }, [userId]);

  const handleRemoveItem = async (savedId) => {
    try {
      const response = await api.delete("/favorites", {
        data: { saved_id: savedId, user_id: userId },
      });
      if (response.data.status === "success") {
        window.dispatchEvent(new CustomEvent("favoritesUpdated"));
        Toastify.success("Removed from favorites");
      } else {
        Toastify.error(response.data.message || "Unknown error");
      }
    } catch (err) {
      Toastify.error(err.response?.data?.message || err.message || "Network error");
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading favorites...</div>;
  }

  if (error) {
    return <p className="text-red-500 text-center py-12">{error}</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
      {favorites.length > 0 ? (
        favorites.map((item) => (
          <AssetItem
            key={item.saved_id}
            item={item}
            type="favorite"
            onRemove={() => handleRemoveItem(item.saved_id)}
          />
        ))
      ) : (
        <p className="col-span-full text-center text-gray-500 py-12">Favorites list is empty</p>
      )}
    </div>
  );
}

export default FavoritesTab;
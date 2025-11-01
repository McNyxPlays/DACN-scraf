import React, { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import api from "../../api/index";
import { Toastify } from "../../components/Toastify";
import FavoriteItem from "./FavoriteItem";

function Favorites() {
  const { user: outletUser } = useOutletContext();
  const [user, setUser] = useState(outletUser);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const validateUser = async () => {
      if (user && user.user_id) {
        try {
          const response = await api.get("/user");
          if (response.data.status === "success" && response.data.user) {
            setUser(response.data.user);
            sessionStorage.setItem("user", JSON.stringify(response.data.user));
          } else {
            setUser(null);
            sessionStorage.removeItem("user");
            setError("Session expired, please log in again.");
          }
        } catch (err) {
          console.error("User validation error:", err);
          setUser(null);
          sessionStorage.removeItem("user");
          setError("Failed to validate session.");
        }
      } else {
        setUser(null);
        setError("Please log in to view your favorites.");
      }
    };
    validateUser();
  }, [outletUser]);

  useEffect(() => {
    if (!user || !user.user_id) {
      setLoading(false);
      return;
    }

    const fetchFavorites = async () => {
      setLoading(true);
      try {
        const response = await api.get("/favorites", {
          params: { user_id: user.user_id },
        });
        if (response.data.status === "success") {
          setFavorites(response.data.favorites || []);
          setError("");
        } else {
          setError(
            `Failed to fetch favorites: ${
              response.data.message || "Unknown error"
            }`
          );
          Toastify.error(
            `Failed to fetch favorites: ${
              response.data.message || "Unknown error"
            }`
          );
        }
      } catch (err) {
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Network or server error";
        setError(`Failed to fetch favorites: ${errorMsg}`);
        Toastify.error(`Failed to fetch favorites: ${errorMsg}`);
        console.error("Fetch favorites error:", {
          error: err,
          response: err.response,
          status: err.response?.status,
          data: err.response?.data,
          userId: user.user_id,
        });
        setFavorites([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();

    const handleFavoritesUpdate = () => {
      setTimeout(() => {
        fetchFavorites();
      }, 500);
    };
    window.addEventListener("favoritesUpdated", handleFavoritesUpdate);
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdate);
    };
  }, [user]);

  const handleRemoveItem = async (savedId) => {
    if (!user || !user.user_id) {
      setError("Please log in to remove favorites.");
      return;
    }
    try {
      const response = await api.delete("/favorites", {
        data: { saved_id: savedId, user_id: user.user_id },
      });
      if (response.data.status === "success") {
        const event = new CustomEvent("favoritesUpdated");
        window.dispatchEvent(event);
        Toastify.success("Item removed from favorites");
      } else {
        const errorMsg = response.data.message || "Unknown error";
        setError(`Failed to remove item: ${errorMsg}`);
        Toastify.error(`Failed to remove item: ${errorMsg}`);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || err.message || "Network or server error";
      setError(`Failed to remove item: ${errorMsg}`);
      Toastify.error(`Failed to remove item: ${errorMsg}`);
      console.error("Remove favorite error:", {
        error: err,
        response: err.response,
        status: err.response?.status,
        data: err.response?.data,
      });
    }
  };

  if (!user || !user.user_id) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Your Favorites
        </h1>
        <p className="text-gray-500 text-center">{error}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-900">Your Favorites</h1>
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your favorites...</p>
        </div>
      )}
      {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
      {favorites.length === 0 && !loading && (
        <p className="text-gray-500 text-center">
          Your favorites list is empty.
        </p>
      )}
      {favorites.length > 0 && !loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((item) => (
            <FavoriteItem
              key={item.saved_id}
              item={item}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Favorites;
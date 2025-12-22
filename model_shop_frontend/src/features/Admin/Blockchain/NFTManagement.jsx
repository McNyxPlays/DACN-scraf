// model_shop_frontend/src/features/Admin/Blockchain/NFTManagement.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";
import { Toastify } from "../../../components/Toastify";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import AdminNFTList from "../components/AdminNFTList";

const NFTManagement = () => {
  const user = useSelector((state) => state.user.user);
  const [nfts, setNfts] = useState([]);
  const [search, setSearch] = useState("");
  const [isForSale, setIsForSale] = useState(-1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state for creating NFT
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [maxSupply, setMaxSupply] = useState("1");
  const [royalty, setRoyalty] = useState("5");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Wallet connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const checkAndConnectWallet = async () => {
      if (!user || !user.wallet_address) {
        await connectWallet();
      } else {
        setIsConnected(true);
      }
    };

    checkAndConnectWallet();
  }, []);  // Empty dependency array: runs only once on mount

  useEffect(() => {
    fetchNfts();
  }, [search, isForSale]);

  const fetchNfts = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (isForSale >= 0) params.is_for_sale = isForSale;
      const response = await api.get("/users/nft", { params });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setNfts(response.data.data);
        setError("");
      } else {
        setNfts([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setNfts([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError("Server error: " + err.response.data.message);
        } else {
          setError("Server error: " + (err.response.statusText || "Unknown error"));
        }
      } else {
        setError("Failed to fetch NFTs: " + (err.message || "Unknown error"));
      }
      console.error("Fetch NFTs error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      Toastify.error("Please install MetaMask!");
      return false;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      const address = accounts[0];

      await api.post("/user/connect-wallet", { wallet_address: address });

      Toastify.success(`Connected: ${address.slice(0, 6)}...${address.slice(-4)}`);
      setIsConnected(true);
      return true;
    } catch (err) {
      Toastify.error("Connect failed: " + (err.message || "Unknown error"));
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle image change
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      Toastify.error("File too large! Max 25MB");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  // Create NFT
  const handleCreateNFT = async (e) => {
    e.preventDefault();

    if (!imageFile || !name.trim()) {
      Toastify.error("Name and image are required");
      return;
    }
    if (!isConnected) {
      Toastify.error("Wallet must be connected first");
      return;
    }
    setIsUploading(true);

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("description", description);
    formData.append("price", price || "0");
    formData.append("maxSupply", maxSupply);
    formData.append("royalty", royalty);
    formData.append("image", imageFile);

    try {
      const res = await api.post("/nft/create", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Toastify.success(`NFT #${res.data.tokenId} created successfully!`);

      // Reset form and refresh list
      setName("");
      setDescription("");
      setPrice("");
      setMaxSupply("1");
      setRoyalty("5");
      setImageFile(null);
      setImagePreview("");
      setShowForm(false);
      fetchNfts(); // Refresh the NFT list after creation
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Create failed: Check console for details";
      Toastify.error(errorMessage);
      console.error("NFT creation error:", err.response?.data || err);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">NFT Management</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={isConnecting || !isConnected}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105 disabled:opacity-70"
        >
          {isConnecting ? "Connecting..." : showForm ? "Cancel" : "+ Create New NFT"}
        </button>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search NFTs by name or token ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <select
          value={isForSale}
          onChange={(e) => setIsForSale(Number(e.target.value))}
          className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="-1">All Sale Statuses</option>
          <option value="1">For Sale</option>
          <option value="0">Not For Sale</option>
        </select>
      </div>

      {showForm && (
        <div className="p-10 rounded-2xl shadow-md mb-12 border border-gray-200">
          <h3 className="text-2xl font-bold mb-8">Create New NFT</h3>
          <form onSubmit={handleCreateNFT} className="space-y-6">
            {/* Upload image */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-purple-500 transition cursor-pointer">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="mx-auto max-h-96 rounded-lg" />
              ) : (
                <div>
                  <p className="text-7xl mb-4 text-gray-400">↑</p>
                  <p className="text-2xl">Drag & drop or click to upload</p>
                  <p className="text-md text-gray-500 mt-2">JPG, PNG, GIF, MP4, GLB... Max 25MB</p>
                </div>
              )}
              <input
                type="file"
                accept="image/*,video/*,audio/*,.glb,.gltf"
                onChange={handleImageChange}
                className="hidden"
                id="nft-file"
              />
              <label htmlFor="nft-file" className="mt-6 inline-block px-8 py-3 bg-purple-600 text-white rounded-lg cursor-pointer hover:bg-purple-700">
                Choose File
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium mb-2 text-gray-700">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="My Awesome NFT #001"
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-700">Price (ETH)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="0.05"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block font-medium mb-2 text-gray-700">Max Supply</label>
                <input
                  type="number"
                  min="1"
                  value={maxSupply}
                  onChange={(e) => setMaxSupply(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block font-medium mb-2 text-gray-700">Royalty (%)</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={royalty}
                  onChange={(e) => setRoyalty(e.target.value)}
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="5"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium mb-2 text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows="4"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Tell the world about your NFT..."
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isUploading}
                className="px-10 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-bold disabled:opacity-70 hover:scale-105 transition"
              >
                {isUploading ? "Creating NFT..." : "Create NFT"}
              </button>
            </div>
          </form>
        </div>
      )}

      <AdminNFTList nfts={nfts} loading={loading} error={error} />
    </div>
  );
};

export default NFTManagement;
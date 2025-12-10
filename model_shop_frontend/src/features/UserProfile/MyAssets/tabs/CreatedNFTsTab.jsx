// src/features/UserProfile/MyAssets/tabs/CreatedNFTsTab.jsx
import React, { useState } from "react";
import { useSelector } from "react-redux";
import { ethers } from "ethers";
import api from "../../../../api";
import { Toastify } from "../../../../components/Toastify";
import MyCreatedNFTsList from "./MyCreatedNFTsList";

function CreatedNFTsTab({ userId }) {
  const user = useSelector((state) => state.user.user);

  const [showForm, setShowForm] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [maxSupply, setMaxSupply] = useState("1");
  const [royalty, setRoyalty] = useState("5");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploading, setIsUploading] = useState(false);

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

  // Handle image
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

  // Create NFT with better error handling
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

      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setMaxSupply("1");
      setRoyalty("5");
      setImageFile(null);
      setImagePreview("");
      setShowForm(false);

    } catch (err) {
      Toastify.error(err.response?.data?.message || "Create failed: Check console for details");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-3xl font-bold">My Created NFTs</h2>
        <button
          onClick={async () => {
            if (!isConnected) {
              const success = await connectWallet();
              if (success) {
                setShowForm(true);
              }
            } else {
              setShowForm(!showForm);
            }
          }}
          disabled={isConnecting}
          className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition transform hover:scale-105 disabled:opacity-70"
        >
          {isConnecting ? "Connecting..." : isConnected ? (showForm ? "Cancel" : "+ Create New NFT") : "Connect Wallet First"}
        </button>
      </div>

      {showForm && (
        <div className="p-10 rounded-2xl shadow-md mb-12 border border-gray-200">
          <h3 className="text-2xl font-bold mb-8">Create New NFT</h3>
          <form onSubmit={handleCreateNFT} className="space-y-6">
            {/* Upload ảnh */}
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

      <MyCreatedNFTsList userId={userId} />
    </div>
  );
}

export default CreatedNFTsTab;
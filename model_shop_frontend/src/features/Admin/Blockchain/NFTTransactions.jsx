// model_shop_frontend/src/features/Admin/Blockchain/NFTTransactions.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api/index";
import { FaSearch } from "react-icons/fa";

const NFTTransactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [search, startDate, endDate]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError("");
      const params = { search };
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const response = await api.get("/order-nft-mints", { params });
      if (response.data && response.data.success && Array.isArray(response.data.data)) {
        setTransactions(response.data.data);
        setError("");
      } else {
        setTransactions([]);
        setError(response.data.message || "Unexpected response format from server");
      }
    } catch (err) {
      setTransactions([]);
      if (err.response) {
        if (err.response.status === 403) {
          setError("You do not have permission to access this page.");
        } else if (err.response.data && err.response.data.message) {
          setError("Server error: " + err.response.data.message);
        } else {
          setError("Server error: " + (err.response.statusText || "Unknown error"));
        }
      } else {
        setError("Failed to fetch transactions: " + (err.message || "Unknown error"));
      }
      console.error("Fetch transactions error:", err);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold mb-4 md:mb-0">NFT Transactions</h1>
      </div>
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search transactions by token ID or tx hash..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary pl-10"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            <FaSearch />
          </div>
        </div>
        <div className="flex gap-4">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
            className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
            className="px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>
      {transactions.length === 0 ? (
        <p className="text-gray-500 text-center">No transactions found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Mint ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Order ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Token ID</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Tx Hash</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Mint Address</th>
                <th className="py-3 px-4 text-left font-semibold text-gray-700">Minted At</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.mint_id} className="border-b">
                  <td className="py-3 px-4">{transaction.mint_id}</td>
                  <td className="py-3 px-4">{transaction.order_id}</td>
                  <td className="py-3 px-4">{transaction.token_id}</td>
                  <td className="py-3 px-4">{transaction.tx_hash.slice(0, 10)}...</td>
                  <td className="py-3 px-4">{transaction.mint_address.slice(0, 10)}...</td>
                  <td className="py-3 px-4">{new Date(transaction.minted_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default NFTTransactions;
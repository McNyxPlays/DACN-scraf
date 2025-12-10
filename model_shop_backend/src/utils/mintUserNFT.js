// src/utils/mintUserNFT.js
require("dotenv").config();
const { ethers } = require("ethers");
const db = require("../config/db");

// Config contract
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.NFT_MINTER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  ["function mint(address to, string tokenURI) external returns (uint256)"],
  wallet
);

const mintUserNFT = async (userId, walletAddress, tokenURI) => {
  let conn;
  try {
    const tx = await contract.mint(walletAddress, tokenURI);
    const receipt = await tx.wait();

    // Get tokenId from Transfer event
    const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
    const log = receipt.logs.find(l => l.topics[0] === iface.getEventTopic("Transfer"));
    const tokenId = log ? iface.parseLog(log).args.tokenId.toString() : null;

    if (!tokenId) throw new Error("Could not parse tokenId");

    conn = await db.getConnection();
    await conn.query(
      `INSERT INTO user_nft_mints 
       (user_id, token_id, tx_hash, mint_address, nft_metadata_url, minted_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, tokenId, receipt.transactionHash, walletAddress, tokenURI]
    );

    return { success: true, tokenId, txHash: receipt.transactionHash };
  } catch (error) {
    console.error("mintUserNFT error:", error);
    return { success: false, error: error.message };
  } finally {
    if (conn) conn.release();
  }
};

module.exports = { mintUserNFT };
require("dotenv").config();
const { ethers } = require("ethers");
const db = require("../config/db");

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "http://127.0.0.1:8545");
const wallet = new ethers.Wallet(process.env.NFT_MINTER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  [
    "function mint(address to, string memory uri, uint96 royaltyBps, uint256 maxSupply) external returns (uint256)",
    "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
  ],
  wallet
);

const mintUserNFT = async (userId, walletAddress, tokenURI, royalty = 0, maxSupply = 1) => {
  let conn;
  try {
    const tx = await contract.mint(walletAddress, tokenURI, royalty * 100, maxSupply);
    const receipt = await tx.wait();

    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }

    const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
    let tokenId = null;
    for (const log of receipt.logs) {
      try {
        const parsedLog = iface.parseLog(log);
        if (parsedLog && parsedLog.name === 'Transfer') {
          tokenId = parsedLog.args.tokenId.toString();
          break;
        }
      } catch (e) {
        continue;
      }
    }

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
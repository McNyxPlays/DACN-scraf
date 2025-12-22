// src/utils/mintNFT.js
const { contract } = require('../config/web3');
const pool = require('../config/db');
const { ethers } = require('ethers');
const { logError } = require('../config/functions');

module.exports.mintNFT = async (userId, walletAddress, metadataURI, imageURL, royalty = 0, maxSupply = 1, name = '', description = '') => {
  try {
    const tx = await contract.mint(walletAddress, metadataURI, royalty * 100, maxSupply);
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

    await pool.query(
      `INSERT INTO user_nft_mints 
       (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url, price, royalty_percent, max_supply, design_id, name, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, tokenId, receipt.hash, walletAddress, metadataURI, imageURL, 0, royalty, maxSupply, tokenId, name || `NFT #${tokenId}`, description || '']
    );

    return { success: true, tokenId, txHash: receipt.hash };
  } catch (error) {
    await logError(`mintNFT error: ${error.message}`);
    return { success: false, error: error.message };
  }
};
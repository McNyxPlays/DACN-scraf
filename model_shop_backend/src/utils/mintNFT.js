// src/utils/mintNFT.js
const { contract } = require('../config/web3');
const pool = require('../config/db'); // // Giữ pool nếu bạn dùng

module.exports.mintNFT = async (userId, walletAddress, metadataURI, imageURL) => {
  try {
    const tx = await contract.mint(walletAddress, metadataURI);
    const receipt = await tx.wait();

    // Lấy tokenId từ event Transfer
    const iface = new ethers.Interface(["event Transfer(address from, address to, uint256 tokenId)"]);
    const log = receipt.logs.find(log => log.topics[0] === iface.getEventTopic("Transfer"));
    const tokenId = log ? iface.parseLog(log).args.tokenId.toString() : null;

    await pool.query(
      'INSERT INTO user_nft_mints (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, tokenId, tx.hash, walletAddress, metadataURI, imageURL]
    );

    return { success: true, tokenId, txHash: tx.hash };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
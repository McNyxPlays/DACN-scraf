// src/controllers/nftController.js
const db = require("../config/db");
const { contract, ethers } = require("../config/web3");
const { uploadImageToIPFS, uploadMetadataToIPFS } = require("../utils/uploadToIPFS");
const { logError } = require("../config/functions");

exports.createNFT = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { name, description = "", price = 0, maxSupply = 1, royalty = 0 } = req.body; // Default maxSupply to 1
  const file = req.file;  // FIXED: Use req.file for upload.single()

  if (!name) return res.status(400).json({ status: 'error', message: 'Name required' });  // Split for better debugging
  if (!file) return res.status(400).json({ status: 'error', message: 'Image file required (must be JPG, PNG, GIF, or WEBP)' });

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query("SELECT wallet_address FROM users WHERE user_id = ?", [req.session.user_id]);
    const wallet_address = rows[0]?.wallet_address;

    if (!wallet_address) return res.status(400).json({ status: 'error', message: 'Please connect wallet first' });

    const imageURI = await uploadImageToIPFS(file);
    const metadataURI = await uploadMetadataToIPFS(name, description, imageURI, { price: parseFloat(price), royalty: parseInt(royalty), maxSupply: parseInt(maxSupply) });

    // FIXED: Call with all 4 params to match contract ABI
    const tx = await contract.mint(wallet_address, metadataURI, parseInt(royalty) * 100, parseInt(maxSupply));
    const receipt = await tx.wait();

    // Robust parse for ethers v6 - parses all logs and finds Transfer
    const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
    const parsedLogs = receipt.logs.map(log => {
      try {
        return iface.parseLog(log);
      } catch {
        return null;
      }
    });

    const transferEvent = parsedLogs.find(log => log && log.name === 'Transfer');
    const tokenId = transferEvent ? transferEvent.args.tokenId.toString() : null;

    if (!tokenId) throw new Error('Failed to parse tokenId from Transfer event');

    // Insert with design_id = tokenId (for editions)
  await conn.query(
  `INSERT INTO user_nft_mints 
   (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url, price, royalty_percent, max_supply, design_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [req.session.user_id, tokenId, receipt.hash, wallet_address, metadataURI, imageURI, price, royalty, maxSupply, tokenId]
  );

    res.json({ status: 'success', tokenId, tx_hash: receipt.transactionHash, metadata_url: metadataURI });
  } catch (error) {
    await logError('createNFT error: ' + error.message);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create NFT' });
  } finally {
    if (conn) conn.release();
  }
};

// New endpoint: Mint more editions - apply similar fix if needed
exports.mintMoreNFT = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { designId, quantity = 1 } = req.body; // designId is original tokenId

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query("SELECT wallet_address FROM users WHERE user_id = ?", [req.session.user_id]);
    const wallet_address = rows[0]?.wallet_address;

    if (!wallet_address) return res.status(400).json({ status: 'error', message: 'Please connect wallet first' });

    const newTokenIds = [];
    for (let i = 0; i = quantity; i++) {
      const tx = await contract.mintMore(designId, wallet_address);
      const receipt = await tx.wait();

      // Robust parse for ethers v6 - parses all logs and finds Transfer
      const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
      const parsedLogs = receipt.logs.map(log => {
        try {
          return iface.parseLog(log);
        } catch {
          return null;
        }
      });

      const transferEvent = parsedLogs.find(log => log && log.name === 'Transfer');
      const newTokenId = transferEvent ? transferEvent.args.tokenId.toString() : null;

      if (!newTokenId) throw new Error('Failed to parse newTokenId from Transfer event');

      // Get metadata from original
      const [original] = await conn.query("SELECT * FROM user_nft_mints WHERE token_id = ?", [designId]);

      await conn.query(
  `INSERT INTO user_nft_mints 
   (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url, price, royalty_percent, max_supply, design_id)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [req.session.user_id, newTokenId, receipt.hash, wallet_address, original[0].nft_metadata_url, original[0].nft_image_url, original[0].price, original[0].royalty_percent, original[0].max_supply, designId]
);

      newTokenIds.push(newTokenId);
    }

    res.json({ status: 'success', newTokenIds });
  } catch (error) {
    await logError('mintMoreNFT error: ' + error.message);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to mint more' });
  } finally {
    if (conn) conn.release();
  }
};
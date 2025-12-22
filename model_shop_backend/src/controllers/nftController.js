// src/controllers/nftController.js
const db = require("../config/db");
const { contract, ethers } = require("../config/web3");
const { uploadImageToIPFS, uploadMetadataToIPFS } = require("../utils/uploadToIPFS");
const { logError } = require("../config/functions");

exports.createNFT = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { name, description = "", price = 0, maxSupply = 1, royalty = 0 } = req.body;
  const file = req.file;

  // Input validation
  if (!name) return res.status(400).json({ status: 'error', message: 'Name required' });
  if (!file) return res.status(400).json({ status: 'error', message: 'Image file required (must be JPG, PNG, GIF, or WEBP)' });
  if (royalty < 0 || royalty > 20) return res.status(400).json({ status: 'error', message: 'Royalty must be between 0 and 20' });
  if (maxSupply < 1) return res.status(400).json({ status: 'error', message: 'Max supply must be at least 1' });

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query("SELECT wallet_address FROM users WHERE user_id = ?", [req.session.user_id]);
    const wallet_address = rows[0]?.wallet_address;

    if (!wallet_address) return res.status(400).json({ status: 'error', message: 'Please connect wallet first' });

    const imageURI = await uploadImageToIPFS(file);
    const metadataURI = await uploadMetadataToIPFS(name, description, imageURI, { price: parseFloat(price), royalty: parseInt(royalty), maxSupply: parseInt(maxSupply) });

    // Call mint function
    const tx = await contract.mint(wallet_address, metadataURI, parseInt(royalty) * 100, parseInt(maxSupply));
    const receipt = await tx.wait();

    // Validate transaction status
    if (receipt.status !== 1) {
      throw new Error('Transaction failed');
    }

    // Parse Transfer event
    const iface = new ethers.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
    ]);

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

    if (!tokenId) {
      throw new Error('Failed to parse tokenId from Transfer event');
    }

    // Insert into database with all required fields
    await conn.query(
      `INSERT INTO user_nft_mints 
       (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url, price, royalty_percent, max_supply, design_id, name, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.session.user_id, tokenId, receipt.hash, wallet_address, metadataURI, imageURI, parseFloat(price), royalty, maxSupply, tokenId, name, description]
    );

    res.json({ status: 'success', tokenId, tx_hash: receipt.transactionHash, metadata_url: metadataURI });
  } catch (error) {
    await logError('createNFT error: ' + error.message);
    res.status(500).json({ status: 'error', message: error.message || 'Failed to create NFT' });
  } finally {
    if (conn) conn.release();
  }
};

exports.mintMoreNFT = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });

  const { designId, quantity = 1 } = req.body;

  // Input validation
  if (!designId) return res.status(400).json({ status: 'error', message: 'Design ID required' });
  if (quantity < 1) return res.status(400).json({ status: 'error', message: 'Quantity must be at least 1' });

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query("SELECT wallet_address FROM users WHERE user_id = ?", [req.session.user_id]);
    const wallet_address = rows[0]?.wallet_address;

    if (!wallet_address) return res.status(400).json({ status: 'error', message: 'Please connect wallet first' });

    const newTokenIds = [];
    for (let i = 0; i < quantity; i++) { // Fixed loop condition
      const tx = await contract.mintMore(designId, wallet_address);
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      const iface = new ethers.Interface(["event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"]);
      let newTokenId = null;
      for (const log of receipt.logs) {
        try {
          const parsedLog = iface.parseLog(log);
          if (parsedLog && parsedLog.name === 'Transfer') {
            newTokenId = parsedLog.args.tokenId.toString();
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!newTokenId) throw new Error('Failed to parse newTokenId from Transfer event');

      const [original] = await conn.query("SELECT * FROM user_nft_mints WHERE token_id = ?", [designId]);
      if (!original[0]) throw new Error('Original NFT not found');

      await conn.query(
        `INSERT INTO user_nft_mints 
         (user_id, token_id, tx_hash, mint_address, nft_metadata_url, nft_image_url, price, royalty_percent, max_supply, design_id, name, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.session.user_id,
          newTokenId,
          receipt.hash,
          wallet_address,
          original[0].nft_metadata_url,
          original[0].nft_image_url,
          original[0].price,
          original[0].royalty_percent,
          original[0].max_supply,
          designId,
          original[0].name || `NFT #${newTokenId}`,
          original[0].description || ''
        ]
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

exports.getOrderNftMints = async (req, res) => {
  try {
    const { search, start_date, end_date } = req.query;
    let query = "SELECT * FROM order_nft_mints WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (token_id LIKE ? OR tx_hash LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }
    if (start_date) {
      query += " AND minted_at >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND minted_at <= ?";
      params.push(end_date);
    }

    const conn = await db.getConnection();
    const [rows] = await conn.query(query, params);
    conn.release();

    res.json({ success: true, data: rows });
  } catch (err) {
    await logError('getOrderNftMints error: ' + err.message);
    res.status(500).json({ success: false, message: err.message || "Failed to fetch transactions" });
  }
};

exports.getUserNFTs = async (req, res) => {
  if (!req.session.user_id) return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  try {
    const conn = await db.getConnection();
    const [rows] = await conn.query('SELECT mint_id, name FROM user_nft_mints WHERE user_id = ?', [req.session.user_id]);
    conn.release();
    res.json({ status: 'success', data: rows });
  } catch (err) {
    await logError('getUserNFTs error: ' + err.message);
    res.status(500).json({ status: 'error', message: 'Failed to fetch NFTs' });
  }
};

exports.getAllUserNfts = async (req, res) => {
  try {
    const { search = '', is_for_sale } = req.query;
    const params = [];

    let query = `
      SELECT 
        mint_id, user_id, token_id, name, price, minted_at,
        nft_image_url, description 
      FROM user_nft_mints 
      WHERE 1=1
    `;

    if (search.trim()) {
      query += " AND (name LIKE ? OR token_id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (is_for_sale !== undefined && is_for_sale !== '-1') {
      const saleValue = is_for_sale === '1' || is_for_sale === 1 ? 1 : 0;
      query += " AND is_for_sale = ?";
      params.push(saleValue);
    }

    query += " ORDER BY minted_at DESC";

    const conn = await db.getConnection();
    try {
      const [rows] = await conn.query(query, params);
      res.json({ success: true, data: rows });
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('getAllUserNfts error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch NFTs' });
  }
};
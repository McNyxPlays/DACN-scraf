// src/utils/uploadToIPFS.js
require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data"); // QUAN TRỌNG: Dùng form-data thay vì FormData của browser
const fs = require("fs");

// Kiểm tra JWT
const PINATA_JWT = process.env.PINATA_JWT;
if (!PINATA_JWT) throw new Error("PINATA_JWT not set in .env!");

// Upload file lên Pinata
const uploadFileToPinata = async (fileBuffer, filename) => {
  const form = new FormData();
  form.append("file", fileBuffer, {
    filename: filename,
    contentType: fileBuffer.mimetype || "application/octet-stream",
  });

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    form,
    {
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
        ...form.getHeaders(), // QUAN TRỌNG: thêm Content-Type multipart/form-data + boundary
      },
    }
  );

  return `ipfs://${res.data.IpfsHash}`;
};

// Upload metadata JSON
const uploadMetadataToPinata = async (name, description, imageURI, extra = {}) => {
  const metadata = {
    name,
    description,
    image: imageURI,
    attributes: Object.entries(extra).map(([key, value]) => ({
      trait_type: key,
      value: value.toString(),
    })),
  };

  const jsonBuffer = Buffer.from(JSON.stringify(metadata, null, 2));
  return await uploadFileToPinata(jsonBuffer, `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_metadata.json`);
};

module.exports = {
  uploadImageToIPFS: async (file) => uploadFileToPinata(file.buffer, file.originalname),
  uploadMetadataToIPFS: uploadMetadataToPinata,
};
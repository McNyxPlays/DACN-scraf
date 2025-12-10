require("dotenv").config();
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet   = new ethers.Wallet(process.env.NFT_MINTER_PRIVATE_KEY, provider);

const contract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  ["function mint(address to, string tokenURI) external returns (uint256)"],
  wallet
);

module.exports = contract;
// src/config/web3.js
require("dotenv").config();
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(
  process.env.BASE_RPC_URL || "http://127.0.0.1:8545"
);

const wallet = new ethers.Wallet(
  process.env.NFT_MINTER_PRIVATE_KEY || "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  provider
);

const abi = [
  "function mint(address to, string memory uri, uint96 royaltyBps, uint256 maxSupply) external returns (uint256)",
  "function mintMore(uint256 tokenId, address to) external",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

const contract = new ethers.Contract(
  process.env.NFT_CONTRACT_ADDRESS,
  abi,
  wallet
);

console.log("Contract loaded at:", contract.target);
module.exports = { contract, ethers };
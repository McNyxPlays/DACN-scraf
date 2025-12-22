require("dotenv").config();
const { ethers } = require("ethers");

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet = new ethers.Wallet(process.env.NFT_MINTER_PRIVATE_KEY, provider);

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

module.exports = contract;
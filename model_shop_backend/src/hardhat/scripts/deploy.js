// scripts/deploy.js
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying ModelShopNFT with account:", deployer.address);

  // SỬA DÒNG NÀY CHO ETHERE v6
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const NFT = await ethers.getContractFactory("ModelShopNFT");
  const nft = await NFT.deploy();

  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("\nModelShopNFT deployed to:", address);
  console.log("\nCopy 2 dòng này vào .env backend:");
  console.log(`NFT_CONTRACT_ADDRESS=${address}`);
  console.log(`NFT_MINTER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
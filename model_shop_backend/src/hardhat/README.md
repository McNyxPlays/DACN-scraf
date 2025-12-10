# Sample Hardhat Project
Hardhat v2.27.1
This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
# 1. Chạy lại node (blockchain reset)
npx hardhat node

# 2. Deploy lại (địa chỉ mới)
npx hardhat run scripts/deploy.js --network localhost
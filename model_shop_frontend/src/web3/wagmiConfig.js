// src/web3/wagmiConfig.js
import { createConfig, http } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { injected, walletConnect } from '@wagmi/connectors'

// Chỉ dùng MetaMask (injected)
const connectors = [injected()]

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  connectors,
  transports: {
    [baseSepolia.id]: http(),
  },
})
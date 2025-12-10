// src/web3/useNFTList.js
import { useAccount, useReadContracts } from 'wagmi'
import { nftABI, NFT_CONTRACT_ADDRESS } from './nftABI'

export function useNFTList() {
  const { address } = useAccount()

  const balanceCall = {
    address: NFT_CONTRACT_ADDRESS,
    abi: nftABI,
    functionName: 'balanceOf',
    args: [address],
  }

  const { data: balance } = useReadContracts({ contracts: [balanceCall] })

  const tokenIdsCalls = Array.from({ length: Number(balance?.[0].result || 0) }, (_, index) => ({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftABI,
    functionName: 'tokenOfOwnerByIndex',
    args: [address, BigInt(index)],
  }))

  const { data: tokenIds } = useReadContracts({ contracts: tokenIdsCalls })

  const uriCalls = tokenIds?.map((id) => ({
    address: NFT_CONTRACT_ADDRESS,
    abi: nftABI,
    functionName: 'tokenURI',
    args: [id.result],
  })) || []

  const { data: uris, isLoading } = useReadContracts({ contracts: uriCalls })

  return { nfts: uris?.map((uri) => uri.result) || [], isLoading }
}
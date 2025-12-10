// src/pages/UserProfile/UserNFTs.jsx
import { useNFTList } from '../../web3/useNFTList'
import NFTCard from '../../components/NFTCard'

export default function UserNFTs() {
  const { nfts, isLoading } = useNFTList()

  if (isLoading) return <p>Đang tải NFT...</p>

  return (
    <div>
      <h2>Các NFT của bạn</h2>
      {nfts.length === 0 ? <p>Không có NFT</p> : nfts.map((uri, index) => (
        <NFTCard key={index} uri={uri} />
      ))}
    </div>
  )
}
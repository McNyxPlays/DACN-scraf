// src/components/NFTCard.jsx
export default function NFTCard({ uri }) {
  const metadata = JSON.parse(atob(uri.split(',')[1])) // Decode base64 JSON

  return (
    <div className="card">
      <img src={metadata.image} alt="NFT" />
      <h3>{metadata.name}</h3>
      <p>{metadata.description}</p>
      {/* Attributes */}
    </div>
  )
}
// // src/components/MintReceiptButton.jsx
// import { useAccount, useWriteContract } from 'wagmi'
// import { nftABI, NFT_CONTRACT_ADDRESS } from '../web3/nftABI'

// export default function MintReceiptButton({ product, receiveNFT, onSuccess }) {
//   const { address, isConnected } = useAccount()
//   const { writeContract, isPending, isSuccess, error, data: tx } = useWriteContract()

//   const handleMint = () => {
//     if (!receiveNFT || !product || !address) return

//     writeContract({
//       address: NFT_CONTRACT_ADDRESS,
//       abi: nftABI,
//       functionName: 'mintProductNFT',
//       args: [
//         address,
//         product.name || 'Product',
//         BigInt(product.price || 0),
//         product.description || 'No description'
//       ],
//     })
//   }

//   if (isSuccess && tx?.hash) onSuccess(tx.hash) // Gửi tx hash về backend lưu DB

//   if (!isConnected) return <button>Connect MetaMask</button>

//   return (
//     <div>
//       <button onClick={handleMint} disabled={isPending || !receiveNFT}>
//         {isPending ? 'Đang mint...' : 'Nhận NFT Sản phẩm'}
//       </button>
//       {isSuccess && <p>Mint thành công! Tx: {tx.hash}</p>}
//       {error && <p>Lỗi: {error.shortMessage}</p>}
//     </div>
//   )
// }


// src/components/MintReceiptButton.jsx
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEventLogs } from 'viem'
import api from '../api'
import { Toastify } from './Toastify'
import { nftABI, NFT_CONTRACT_ADDRESS } from '../web3/nftABI'

export default function MintReceiptButton({ product, order_detail_id, order_id }) {
  const { address, isConnected } = useAccount()
  const [isMinting, setIsMinting] = useState(false)

  const { writeContract, data: hash, isPending, isSuccess: isTxSent } = useWriteContract()
  
  // Đợi receipt để lấy tokenId từ event Transfer
  const { data: receipt, isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  // === MINT NFT ===
  const handleMint = async () => {
    if (!isConnected || !address) {
      Toastify.error('Vui lòng kết nối MetaMask')
      return
    }
    if (!product?.name || !order_detail_id || !order_id) {
      Toastify.error('Thiếu thông tin sản phẩm')
      return
    }

    setIsMinting(true)

    try {
      writeContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: nftABI,
        functionName: 'mintProductNFT',
        args: [
          address,
          product.name || 'Sản phẩm',
          BigInt(Math.round((product.price || 0) * 25000)), // USD → VND
          product.description || 'Sản phẩm độc quyền từ Model Shop',
        ],
      })
    } catch (err) {
      console.error(err)
      Toastify.error('Mint thất bại')
      setIsMinting(false)
    }
  }

  // === Khi transaction thành công → lấy tokenId + lưu vào DB ===
  React.useEffect(() => {
    if (!receipt || !isTxSent) return

    try {
      // Lấy logs từ receipt
      const logs = parseEventLogs({
        abi: nftABI,
        logs: receipt.logs,
        eventName: 'Transfer',
      })

      // Event Transfer(address from, address to, uint256 tokenId)
      const transferLog = logs.find(log => 
        log.args.from === '0x0000000000000000000000000000000000000000' && 
        log.args.to?.toLowerCase() === address?.toLowerCase()
      )

      if (!transferLog?.args?.tokenId) {
        Toastify.error('Không tìm thấy tokenId')
        return
      }

      const tokenId = transferLog.args.tokenId.toString()

      // Gọi API backend lưu NFT
      api.post('/orders/nft-mint', {
        order_id,
        order_detail_id,
        token_id: tokenId,
        tx_hash: receipt.transactionHash,
        mint_address: address,
      }).then(() => {
        Toastify.success(`Mint thành công! Token ID: #${tokenId}`)
        // Reload trang để cập nhật trạng thái "Đã mint"
        window.location.reload()
      }).catch(err => {
        console.error(err)
        Toastify.error('Lưu NFT thất bại (vẫn mint thành công trên chain)')
      })

    } catch (err) {
      console.error(err)
      Toastify.error('Xử lý receipt lỗi')
    } finally {
      setIsMinting(false)
    }
  }, [receipt, isTxSent, address, order_id, order_detail_id])

  // === UI ===
  if (!isConnected) {
    return (
      <button className="bg-gray-400 text-white px-6 py-3 rounded-xl font-bold cursor-not-allowed opacity-70">
        Kết nối ví
      </button>
    )
  }

  const isProcessing = isPending || isConfirming || isMinting

  return (
    <div className="text-right">
      <button
        onClick={handleMint}
        disabled={isProcessing}
        className={`px-8 py-4 rounded-xl font-bold text-white shadow-lg transition transform hover:scale-105 ${
          isProcessing
            ? 'bg-orange-500 cursor-wait'
            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.3" />
              <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            {isPending ? 'Đang gửi...' : isConfirming ? 'Đang xác nhận...' : 'Đang xử lý...'}
          </span>
        ) : (
          'Mint NFT miễn phí'
        )}
      </button>

      {hash && !isConfirming && (
        <p className="text-xs text-gray-500 mt-2">
          Tx:{' '}
          <a
            href={`https://sepolia.basescan.org/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {hash.slice(0, 10)}...{hash.slice(-8)}
          </a>
        </p>
      )}
    </div>
  )
}
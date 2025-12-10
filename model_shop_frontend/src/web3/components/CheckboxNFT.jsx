// src/components/CheckboxNFT.jsx
import { useState } from 'react'

export default function CheckboxNFT({ onChange }) {
  const [checked, setChecked] = useState(false)

  const handleChange = (e) => {
    setChecked(e.target.checked)
    onChange(e.target.checked)
  }

  return (
    <label>
      <input type="checkbox" checked={checked} onChange={handleChange} />
      Nhận NFT cho sản phẩm này (miễn phí trên testnet)
    </label>
  )
}
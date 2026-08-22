import { useState } from 'react'
import React, { useState } from 'react'
import { TICKER_DOMAINS } from '../lib/tickerDomains'

// Warna avatar fallback deterministik per kode saham
const AVATAR_COLORS = ['#14171a', '#2f5233', '#7a4a1f', '#3a4a7a', '#7a2f4a', '#1f5a5a', '#5a3a7a']

function colorFor(kode) {
  if (!kode) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < kode.length; i++) hash = kode.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Urutan pencarian logo:
// 1. File lokal di public/logos/ (jika kamu mau override khusus)
// 2. CDN Stockbit Logo (otomatis untuk hampir semua saham IHSG)
// 3. Google Favicon dari domain resmi perusahaan
// 4. Inisial teks abjad (fallback terakhir)
export default function TickerBadge({ kode = '', size = 20 }) {
  const [hasError, setHasError] = useState(false)
  const cleanKode = (kode || '').trim().toUpperCase()

  // Jika kode kosong atau gambar sebelumnya gagal load, tampilkan fallback badge huruf
  if (!cleanKode || hasError) {
    const initial = cleanKode ? cleanKode.slice(0, 2) : '?'
    return (
      <span
        className="ticker-badge ticker-badge-fallback"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          minWidth: `${size}px`,
          minHeight: `${size}px`,
          fontSize: `${Math.max(10, Math.floor(size * 0.38))}px`,
          background: '#0284c7',
        }}
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={`/logos/${cleanKode}.png`}
      alt={cleanKode}
      className="ticker-badge"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
      }}
      onError={() => setHasError(true)}
    />
  )
}
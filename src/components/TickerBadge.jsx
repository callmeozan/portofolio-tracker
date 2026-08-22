import React, { useState } from 'react'
import { TICKER_DOMAINS } from '../lib/tickerDomains'

// Warna avatar deterministik per emiten
const AVATAR_COLORS = ['#0284c7', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#7c3aed']

function colorFor(kode) {
  if (!kode) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < kode.length; i++) hash = kode.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function TickerBadge({ kode = '', size = 20 }) {
  const [hasError, setHasError] = useState(false)
  const cleanKode = (kode || '').trim().toUpperCase()
  const domain = TICKER_DOMAINS?.[cleanKode]

  // Render badge inisial teks bulat
  const renderFallback = () => (
    <span
      className="ticker-badge ticker-badge-fallback"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        fontSize: `${Math.max(10, Math.floor(size * 0.38))}px`,
        background: colorFor(cleanKode),
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {cleanKode ? cleanKode.slice(0, 2) : '?'}
    </span>
  )

  // Jika emiten tidak terdaftar di tickerDomains atau gagal load gambar, langsung tampilkan inisial (tanpa request domain rusak)
  if (!cleanKode || !domain || hasError) {
    return renderFallback()
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt={cleanKode}
      className="ticker-badge"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        flexShrink: 0,
      }}
      onError={() => setHasError(true)}
    />
  )
}
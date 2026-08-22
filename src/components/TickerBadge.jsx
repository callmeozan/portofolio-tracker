import React, { useState } from 'react'
import { TICKER_DOMAINS } from '../lib/tickerDomains'

// Warna avatar fallback per kode saham
const AVATAR_COLORS = ['#0284c7', '#2563eb', '#0d9488', '#16a34a', '#d97706', '#dc2626', '#7c3aed']

function colorFor(kode) {
  if (!kode) return AVATAR_COLORS[0]
  let hash = 0
  for (let i = 0; i < kode.length; i++) hash = kode.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function TickerBadge({ kode = '', size = 20 }) {
  // step: 0 = stockbit cdn, 1 = google favicon, 2 = initial text badge
  const [step, setStep] = useState(0)
  const cleanKode = (kode || '').trim().toUpperCase()

  if (!cleanKode || step >= 2) {
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
          background: colorFor(cleanKode),
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
        }}
      >
        {initial}
      </span>
    )
  }

  // 1. Coba CDN Stockbit
  // 2. Coba Google Favicon via domain resmi
  const domain = TICKER_DOMAINS?.[cleanKode]
  const currentSrc =
    step === 0
      ? `https://images.stockbit.com/logos/companies/${cleanKode}.png`
      : domain
      ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
      : null

  if (!currentSrc) {
    // Kalau tidak ada domain di database, langsung ke inisial
    const initial = cleanKode.slice(0, 2)
    return (
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
        }}
      >
        {initial}
      </span>
    )
  }

  return (
    <img
      src={currentSrc}
      alt={cleanKode}
      className="ticker-badge"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
      }}
      onError={() => setStep((prev) => prev + 1)}
    />
  )
}
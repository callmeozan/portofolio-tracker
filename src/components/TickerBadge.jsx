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

export default function TickerBadge({ kode }) {
  const cleanKode = kode?.toUpperCase() || ''
  const domain = TICKER_DOMAINS?.[cleanKode]
  
  // Langsung mulai dari CDN Stockbit asli kamu
  const [stage, setStage] = useState('cdn')

  if (stage === 'fallback' || !cleanKode) {
    return (
      <span className="ticker-badge ticker-badge-fallback" style={{ background: colorFor(cleanKode) }} title={cleanKode}>
        {cleanKode.slice(0, 2)}
      </span>
    )
  }

  // Tahap 1: CDN Stockbit asli
  // Tahap 2: Google Favicon domain resmi
  let src = `https://assets.stockbit.com/logos/companies/${cleanKode}.png`
  if (stage === 'domain') {
    src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  }

  const handleError = () => {
    if (stage === 'cdn') {
      setStage(domain ? 'domain' : 'fallback')
    } else {
      setStage('fallback')
    }
  }

  return (
    <img
      className="ticker-badge"
      src={src}
      alt={cleanKode}
      onError={handleError}
    />
  )
}
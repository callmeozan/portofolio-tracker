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
  const [stage, setStage] = useState('tv') // Mulai dari CDN TradingView / GoStock

  if (stage === 'fallback' || !cleanKode) {
    return (
      <span className="ticker-badge ticker-badge-fallback" style={{ background: colorFor(cleanKode) }} title={cleanKode}>
        {cleanKode.slice(0, 2)}
      </span>
    )
  }

  // 1. CDN TradingView (Sangat lengkap untuk saham IDX)
  // 2. Google Favicon via domain resmi
  let src = `https://s3-symbol-logo.tradingview.com/idx--${cleanKode.toLowerCase()}.svg`
  if (stage === 'domain') {
    src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  }

  const handleError = () => {
    if (stage === 'tv') {
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
import { useState } from 'react'
import { TICKER_DOMAINS } from '../lib/tickerDomains'

// Warna avatar fallback -- deterministik per kode saham (kode yang sama
// selalu dapet warna yang sama), bukan random tiap render.
const AVATAR_COLORS = ['#14171a', '#2f5233', '#7a4a1f', '#3a4a7a', '#7a2f4a', '#1f5a5a', '#5a3a7a']

function colorFor(kode) {
  let hash = 0
  for (let i = 0; i < kode.length; i++) hash = kode.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// Urutan coba gambar: (1) logo custom yang di-upload manual ke public/logos/,
// (2) favicon domain resmi perusahaan (kalau ada di tickerDomains.js),
// (3) avatar inisial kalau dua-duanya gagal/gak ada.
export default function TickerBadge({ kode }) {
  const domain = TICKER_DOMAINS[kode]
  const [stage, setStage] = useState('local')

  if (stage === 'fallback') {
    return (
      <span className="ticker-badge ticker-badge-fallback" style={{ background: colorFor(kode) }} title={kode}>
        {kode.slice(0, 2)}
      </span>
    )
  }

  const src = stage === 'local'
    ? `/logos/${kode}.png`
    : `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

  return (
    <img
      className="ticker-badge"
      src={src}
      alt={kode}
      onError={() => setStage(stage === 'local' && domain ? 'domain' : 'fallback')}
    />
  )
}

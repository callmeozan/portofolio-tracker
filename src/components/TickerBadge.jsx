import { useState } from 'react'
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
export default function TickerBadge({ kode }) {
  const cleanKode = kode?.toUpperCase() || ''
  const domain = TICKER_DOMAINS[cleanKode]
  const [stage, setStage] = useState('local')

  if (stage === 'fallback' || !cleanKode) {
    return (
      <span className="ticker-badge ticker-badge-fallback" style={{ background: colorFor(cleanKode) }} title={cleanKode}>
        {cleanKode.slice(0, 2)}
      </span>
    )
  }

  // Tentukan URL gambar berdasarkan stage saat ini
  let src = `/logos/${cleanKode}.png`
  if (stage === 'cdn') {
    src = `https://assets.stockbit.com/logos/companies/${cleanKode}.png`
  } else if (stage === 'domain') {
    src = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  }

  // Handler transisi jika logo gagal dimuat (404/error)
  const handleError = () => {
    if (stage === 'local') {
      setStage('cdn')
    } else if (stage === 'cdn') {
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
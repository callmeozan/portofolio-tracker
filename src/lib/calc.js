// Semua angka turunan dihitung di sini dari raw data, BUKAN disimpan
// manual di database — supaya gak ada lagi kasus #REF! kayak di sheet lama.

export function formatRp(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const neg = n < 0
  const abs = Math.round(Math.abs(n))
  return (neg ? '-' : '') + 'Rp' + abs.toLocaleString('id-ID')
}

export function formatPct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ---- Holdings (posisi aktif) ----
export function holdingMetrics(h, totalDividenKode = 0) {
  const hargaBeliTotal = h.total_harga_beli
  const hargaPasar = (h.harga_saat_ini ?? 0) * h.jumlah_lot * 100
  const floating = hargaPasar - hargaBeliTotal
  const floatingPct = hargaBeliTotal ? (floating / hargaBeliTotal) * 100 : null
  const dividendYield = hargaBeliTotal ? (totalDividenKode / hargaBeliTotal) * 100 : null
  return { hargaPasar, floating, floatingPct, dividendYield, totalDividenKode }
}

export function portfolioTotals(holdings, dividends = []) {
  let totalInvested = 0
  let totalMarket = 0
  for (const h of holdings) {
    const { hargaPasar } = holdingMetrics(h)
    totalInvested += h.total_harga_beli
    totalMarket += hargaPasar
  }
  // Total dividen = jumlah SEMUA baris di tabel Dividen (termasuk dari
  // saham yang udah dijual), supaya sama dengan angka itemized-nya.
  const totalDividen = dividends.reduce((sum, d) => sum + dividendMetrics(d).totalDividen, 0)
  const floating = totalMarket - totalInvested
  const floatingPct = totalInvested ? (floating / totalInvested) * 100 : null
  return { totalInvested, totalMarket, totalDividen, floating, floatingPct }
}

// Jumlah dividen per kode saham, dihitung dari tabel Dividen (bukan
// field manual lagi) -- supaya gak bisa nyimpang dari data itemized.
export function dividendTotalsByKode(dividends) {
  const map = {}
  for (const d of dividends) {
    const { totalDividen } = dividendMetrics(d)
    map[d.kode_saham] = (map[d.kode_saham] ?? 0) + totalDividen
  }
  return map
}

export function allocationPct(h, totalMarket) {
  const { hargaPasar } = holdingMetrics(h)
  return totalMarket ? (hargaPasar / totalMarket) * 100 : null
}

// ---- Closed positions ----
export function closedMetrics(c) {
  const delta = c.nilai_jual - c.nilai_beli
  const deltaPct = c.nilai_beli ? (delta / c.nilai_beli) * 100 : null
  return { delta, deltaPct }
}

// ---- Dividends ----
export function dividendMetrics(d) {
  const totalDividen = d.dividen_per_saham * d.jumlah_lot * 100
  const yieldPct = d.nilai_beli ? (totalDividen / d.nilai_beli) * 100 : null
  return { totalDividen, yieldPct }
}

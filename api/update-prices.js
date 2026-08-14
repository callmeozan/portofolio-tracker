// Vercel Serverless Function — dipanggil otomatis oleh Vercel Cron
// (lihat vercel.json) tiap 15 menit selama jam bursa.
//
// Ambil kode saham unik dari tabel `holdings`, query harga terakhir
// dari Yahoo Finance (ticker .JK, delay ~15-20 menit — bukan real-time,
// tapi gratis & cukup akurat buat konten edukasi ini), lalu update
// kolom harga_saat_ini + harga_updated_at.
//
// PENTING: pakai SERVICE ROLE KEY di sini (bukan anon key), karena
// RLS ngeblok write dari non-authenticated user. Service role key
// HARUS cuma ada di Environment Variables Vercel, JANGAN pernah
// ditaruh di kode frontend / VITE_ env var.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Lindungi endpoint ini dari dipanggil sembarang orang
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { data: holdings, error: fetchErr } = await supabase
    .from('holdings')
    .select('id, kode_saham')

  if (fetchErr) {
    return res.status(500).json({ error: fetchErr.message })
  }
  if (!holdings || holdings.length === 0) {
    return res.status(200).json({ message: 'Tidak ada holdings untuk diupdate.' })
  }

  const uniqueKodes = [...new Set(holdings.map((h) => h.kode_saham))]
  const results = []

  for (const kode of uniqueKodes) {
    try {
      const price = await fetchYahooPrice(kode)
      if (price == null) {
        results.push({ kode, status: 'skip', reason: 'harga tidak ditemukan' })
        continue
      }
      const { error: updateErr } = await supabase
        .from('holdings')
        .update({ harga_saat_ini: price, harga_updated_at: new Date().toISOString() })
        .eq('kode_saham', kode)

      results.push({ kode, status: updateErr ? 'error' : 'ok', price, error: updateErr?.message })
    } catch (e) {
      results.push({ kode, status: 'error', error: e.message })
    }
  }

  return res.status(200).json({ updated_at: new Date().toISOString(), results })
}

async function fetchYahooPrice(kodeSaham) {
  const ticker = `${kodeSaham}.JK`
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pp-sahamdarinol/1.0)' },
  })
  if (!resp.ok) return null
  const json = await resp.json()
  const result = json?.chart?.result?.[0]
  const price = result?.meta?.regularMarketPrice
  return typeof price === 'number' ? price : null
}

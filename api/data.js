import { createClient } from '@supabase/supabase-js'
import { isRequestAuthenticated } from './lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  if (!isRequestAuthenticated(req, 'member')) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const [h, c, d, s, r] = await Promise.all([
    supabase.from('holdings').select('*').order('kode_saham'),
    supabase.from('closed_positions').select('*').order('tanggal_jual', { ascending: false }),
    supabase.from('dividends').select('*').order('tanggal_terima', { ascending: false }),
    supabase.from('portfolio_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('reactions').select('*').order('emoji'),
  ])

  const err = h.error || c.error || d.error || s.error || r.error
  if (err) {
    return res.status(500).json({ error: err.message })
  }

  // Jangan pernah kirim member_password ke browser walaupun admin yang minta --
  // gak ada alasan frontend butuh tau isinya, cukup bisa GANTI (lewat mutate).
  const settings = s.data ? { ...s.data } : { id: 1, sisa_cash: 0 }
  delete settings.member_password

  return res.status(200).json({
    holdings: h.data,
    closed_positions: c.data,
    dividends: d.data,
    portfolio_settings: settings,
    reactions: r.data,
  })
}

import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createSessionCookie } from './lib/session.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const { password } = req.body || {}
  if (!password) {
    return res.status(400).json({ error: 'password kosong' })
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('portfolio_settings')
    .select('member_password')
    .eq('id', 1)
    .maybeSingle()

  if (error || !data?.member_password) {
    return res.status(500).json({ error: 'Password member belum di-set admin' })
  }

  const a = Buffer.from(String(password))
  const b = Buffer.from(String(data.member_password))
  const match = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!match) {
    return res.status(401).json({ error: 'Password salah, cek lagi Community Post terbaru' })
  }

  res.setHeader('Set-Cookie', createSessionCookie('member'))
  return res.status(200).json({ ok: true })
}

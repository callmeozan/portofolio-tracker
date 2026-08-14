import crypto from 'crypto'
import { createSessionCookie } from './lib/session.js'

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  const { password } = req.body || {}
  const correctPassword = process.env.ADMIN_PASSWORD

  if (!password || !correctPassword) {
    return res.status(400).json({ error: 'password kosong' })
  }

  // timing-safe compare biar gak bocor info lewat response time
  const a = Buffer.from(String(password))
  const b = Buffer.from(String(correctPassword))
  const match = a.length === b.length && crypto.timingSafeEqual(a, b)

  if (!match) {
    return res.status(401).json({ error: 'Password salah' })
  }

  res.setHeader('Set-Cookie', createSessionCookie())
  return res.status(200).json({ ok: true })
}

import { clearSessionCookie } from './lib/session.js'

export default function handler(req, res) {
  res.setHeader('Set-Cookie', clearSessionCookie())
  return res.status(200).json({ ok: true })
}

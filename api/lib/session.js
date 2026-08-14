// Session token sederhana: base64(payload).base64(hmac-sha256)
// Gak pakai library luar -- cukup modul `crypto` bawaan Node.
// Dipakai buat 2 jenis sesi terpisah: "admin" (bisa edit data) dan
// "member" (bisa liat konten). Cookie-nya beda nama, jadi independen --
// bisa jadi member doang, atau member + admin sekaligus.

import crypto from 'crypto'

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000 // 30 hari

function cookieName(type) {
  return type === 'admin' ? 'pp_admin_session' : 'pp_member_session'
}

function sign(payload) {
  const secret = process.env.ADMIN_SESSION_SECRET
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${hmac}`
}

function verify(token) {
  if (!token || !token.includes('.')) return null
  const [payloadB64, hmac] = token.split('.')
  const secret = process.env.ADMIN_SESSION_SECRET
  const expectedHmac = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  const a = Buffer.from(hmac)
  const b = Buffer.from(expectedHmac)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString())
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}

export function createSessionCookie(type = 'admin') {
  const token = sign({ exp: Date.now() + SESSION_DURATION_MS, type })
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000)
  return `${cookieName(type)}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`
}

export function clearSessionCookie(type = 'admin') {
  return `${cookieName(type)}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export function isRequestAuthenticated(req, type = 'admin') {
  const cookieHeader = req.headers.cookie || ''
  const match = cookieHeader.match(new RegExp(`${cookieName(type)}=([^;]+)`))
  if (!match) return false
  return verify(match[1]) !== null
}

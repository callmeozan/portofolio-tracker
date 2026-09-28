export async function checkMemberSession() {
  const res = await fetch('/api/member-check', { credentials: 'include' })
  const data = await res.json()
  return data.isMember
}

export async function memberLogin(password) {
  const res = await fetch('/api/member-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login gagal')
  return true
}

export async function memberLogout() {
  await fetch('/api/member-logout', { method: 'POST', credentials: 'include' })
}

// Satu-satunya cara ambil data portofolio sekarang -- lewat server yang
// ngecek sesi member dulu. Gak ada lagi baca langsung dari Supabase pakai
// anon key, jadi data beneran gak bisa ditarik tanpa lolos gate.
export async function fetchPortfolioData() {
  const res = await fetch('/api/data', { credentials: 'include' })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('Gagal memuat data')
  return res.json()
}

export async function addBuyHistory(payload) {
  const res = await fetch('/api/buy-history', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan riwayat pembelian')
  return data
}

export async function deleteBuyHistory(id) {
  const res = await fetch('/api/buy-history', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal menghapus data')
  return data
}

export async function updateBuyHistory(payload) {
  const res = await fetch('/api/buy-history', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal mengubah data')
  return data
}
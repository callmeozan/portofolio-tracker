export async function checkAdminSession() {
  const res = await fetch('/api/admin-check', { credentials: 'include' })
  const data = await res.json()
  return data.isAdmin
}

export async function adminLogin(password) {
  const res = await fetch('/api/admin-login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Login gagal')
  return true
}

export async function adminLogout() {
  await fetch('/api/admin-logout', { method: 'POST', credentials: 'include' })
}

export async function adminMutate(table, action, { id, payload } = {}) {
  const res = await fetch('/api/admin/mutate', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action, id, payload }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Gagal menyimpan')
  return true
}

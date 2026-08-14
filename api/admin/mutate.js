import { createClient } from '@supabase/supabase-js'
import { isRequestAuthenticated } from '../lib/session.js'

// Whitelist tabel yang boleh ditulis lewat endpoint ini -- jangan pernah
// terima nama tabel bebas dari client tanpa divalidasi kayak gini.
const ALLOWED_TABLES = new Set(['holdings', 'closed_positions', 'dividends', 'portfolio_settings'])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' })
  }

  if (!isRequestAuthenticated(req)) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { table, action, id, payload } = req.body || {}

  if (!ALLOWED_TABLES.has(table)) {
    return res.status(400).json({ error: 'tabel tidak dikenal' })
  }
  if (!['insert', 'update', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'action tidak dikenal' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  let result
  if (action === 'insert') {
    result = await supabase.from(table).insert(payload)
  } else if (action === 'update') {
    if (!id) return res.status(400).json({ error: 'id wajib diisi buat update' })
    result = await supabase.from(table).update(payload).eq('id', id)
  } else {
    if (!id) return res.status(400).json({ error: 'id wajib diisi buat delete' })
    result = await supabase.from(table).delete().eq('id', id)
  }

  if (result.error) {
    return res.status(500).json({ error: result.error.message })
  }
  return res.status(200).json({ ok: true })
}

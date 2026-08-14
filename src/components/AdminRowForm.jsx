import { useState } from 'react'
import { FIELD_CONFIG, emptyForm } from '../lib/fieldConfig'
import { adminMutate } from '../lib/adminApi'

export default function AdminRowForm({ table, editingRow, onDone, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!editingRow) return emptyForm(table)
    const f = {}
    for (const field of FIELD_CONFIG[table]) f[field.name] = editingRow[field.name] ?? ''
    return f
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = { ...form }
    for (const field of FIELD_CONFIG[table]) {
      if (field.type === 'number' && payload[field.name] !== '') {
        payload[field.name] = Number(payload[field.name])
      }
      if ((field.type === 'text' || field.type === 'textarea') && payload[field.name] === '') {
        payload[field.name] = null
      }
    }
    if (table === 'portfolio_settings' && 'announcement' in payload) {
      payload.announcement_updated_at = payload.announcement ? new Date().toISOString() : null
    }
    try {
      if (editingRow) {
        await adminMutate(table, 'update', { id: editingRow.id, payload })
      } else {
        // Kalau nambah saham baru dan "Harga Kini" gak diisi, default-in ke
        // harga beli dulu -- nanti cron auto-update yang bakal ngoreksi di
        // siklus berikutnya, jadi field ini gak wajib diisi manual.
        if (table === 'holdings' && !payload.harga_saat_ini) {
          payload.harga_saat_ini = payload.harga_beli_rata
        }
        await adminMutate(table, 'insert', { payload })
      }
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <div className="admin-form-grid">
        {FIELD_CONFIG[table].map((field) => (
          <label key={field.name} className="admin-field">
            <span>{field.label}</span>
            {field.type === 'checkbox' ? (
              <input
                type="checkbox"
                checked={!!form[field.name]}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })}
              />
            ) : field.type === 'textarea' ? (
              <textarea
                rows={3}
                value={form[field.name] ?? ''}
                placeholder="Tulis pengumuman... link (https://...) otomatis jadi bisa diklik"
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              />
            ) : (
              <input
                type={field.type}
                step={field.type === 'number' ? 'any' : undefined}
                value={form[field.name] ?? ''}
                onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
              />
            )}
          </label>
        ))}
      </div>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-form-actions">
        <button className="btn-sm btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : editingRow ? 'Update' : 'Tambah'}
        </button>
        <button className="btn-sm btn-ghost" type="button" onClick={onCancel}>
          Batal
        </button>
      </div>
    </form>
  )
}

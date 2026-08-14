import { useState } from 'react'
import { adminMutate } from '../lib/adminApi'

export default function MemberPasswordForm({ onDone, onCancel }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!value.trim()) {
      setError('Password gak boleh kosong')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await adminMutate('portfolio_settings', 'update', { id: 1, payload: { member_password: value.trim() } })
      onDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="admin-form" onSubmit={handleSubmit}>
      <label className="admin-field" style={{ maxWidth: 280 }}>
        <span>Password Member Baru</span>
        <input
          type="text"
          value={value}
          placeholder="Ketik password baru"
          onChange={(e) => setValue(e.target.value)}
          autoFocus
        />
      </label>
      {error && <p className="admin-error">{error}</p>}
      <div className="admin-form-actions">
        <button className="btn-sm btn-primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan...' : 'Ganti Password'}
        </button>
        <button className="btn-sm btn-ghost" type="button" onClick={onCancel}>Batal</button>
      </div>
    </form>
  )
}

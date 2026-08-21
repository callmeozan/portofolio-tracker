import { useState } from 'react'
import { FIELD_CONFIG, emptyForm } from '../lib/fieldConfig'
import { adminMutate } from '../lib/adminApi'

const TABLE_LABELS = {
  holdings: 'Posisi Aktif',
  closed_positions: 'Riwayat Penjualan',
  dividends: 'Penerimaan Dividen',
  portfolio_settings: 'Pengaturan Portofolio',
}

export default function AdminRowForm({ table, editingRow, onDone, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!editingRow) return emptyForm(table)
    const f = {}
    for (const field of FIELD_CONFIG[table]) f[field.name] = editingRow[field.name] ?? ''

    // Hitung balik harga per lembar jika sedang mengedit closed_positions
    if (table === 'closed_positions' && editingRow.jumlah_lot > 0) {
      const lembar = editingRow.jumlah_lot * 100
      f.harga_beli_rata = editingRow.harga_beli ?? Math.round(Number(editingRow.nilai_beli) / lembar)
      f.harga_jual_rata = editingRow.harga_jual ?? Math.round(Number(editingRow.nilai_jual) / lembar)
    }

    // Hitung balik harga_beli jika data lama dividends hanya memiliki nilai_beli
    if (table === 'dividends' && !f.harga_beli && editingRow.jumlah_lot > 0 && editingRow.nilai_beli) {
      f.harga_beli = Math.round(Number(editingRow.nilai_beli) / (editingRow.jumlah_lot * 100))
    }

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

    if (table === 'holdings') {
      const lot = Number(payload.jumlah_lot) || 0
      const avgBeli = Number(payload.harga_beli_rata) || 0
      payload.total_harga_beli = lot * 100 * avgBeli

      if (!payload.harga_saat_ini) {
        payload.harga_saat_ini = payload.harga_beli_rata
      }
    }

    if (table === 'closed_positions') {
      const lot = Number(payload.jumlah_lot) || 0
      const hargaBeli = Number(payload.harga_beli_rata) || 0
      const hargaJual = Number(payload.harga_jual_rata) || 0

      payload.nilai_beli = lot * 100 * hargaBeli
      payload.nilai_jual = lot * 100 * hargaJual
      payload.harga_beli = hargaBeli
      payload.harga_jual = hargaJual

      delete payload.harga_beli_rata
      delete payload.harga_jual_rata
    }

    if (table === 'dividends') {
      const lot = Number(payload.jumlah_lot) || 0
      const hargaBeli = Number(payload.harga_beli) || 0
      payload.nilai_beli = lot * 100 * hargaBeli
    }

    try {
      if (editingRow) {
        await adminMutate(table, 'update', { id: editingRow.id, payload })
      } else {
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
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head">
          <h3>
            {editingRow ? 'Edit' : 'Tambah'} {TABLE_LABELS[table] || table}
          </h3>
          <button className="admin-modal-close" onClick={onCancel} type="button" aria-label="Tutup">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-form-grid">
            {FIELD_CONFIG[table].map((field) => (
              <label key={field.name} className={`admin-field ${field.type === 'checkbox' ? 'is-checkbox' : ''}`}>
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
                    required={field.name !== 'keterangan' && field.name !== 'harga_saat_ini' && field.name !== 'announcement'}
                  />
                )}
              </label>
            ))}
          </div>

          {error && <p className="admin-error">{error}</p>}

          <div className="admin-form-actions">
            <button className="btn-sm btn-ghost" type="button" onClick={onCancel}>
              Batal
            </button>
            <button className="btn-sm btn-primary" type="submit" disabled={saving}>
              {saving ? 'Menyimpan...' : editingRow ? 'Simpan Perubahan' : 'Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
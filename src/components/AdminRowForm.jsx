import { useState } from 'react'
import { FIELD_CONFIG, emptyForm } from '../lib/fieldConfig'
import { adminMutate } from '../lib/adminApi'
import { supabase } from '../lib/supabaseClient' // <--- Fix 1: Import Supabase client!

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

    if (table === 'holdings') {
      const lot = Number(payload.jumlah_lot) || 0
      const avgBeli = Number(payload.harga_beli_rata) || 0
      
      payload.jumlah_lot = lot
      payload.harga_beli_rata = avgBeli
      payload.total_harga_beli = lot * 100 * avgBeli

      // Fix 2: Gunakan !editingRow (bukan !row) untuk cek apakah ini Tambah Baru
      if (!editingRow && lot > 0 && avgBeli > 0 && payload.kode_saham) {
        try {
          await adminMutate('buy_history', 'insert', {
            payload: {
              kode: payload.kode_saham.toUpperCase(),
              tanggal_beli: new Date().toISOString().split('T')[0],
              jumlah_lot: lot,
              harga_beli: avgBeli,
              total_investasi: lot * 100 * avgBeli,
              modal_dca: lot * 100 * avgBeli,
              catatan: 'Pembelian Perdana'
            }
          })
        } catch (dbErr) {
          console.warn('Gagal buat riwayat DCA otomatis:', dbErr)
        }
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
      console.log('A. Mencoba simpan ke database via adminMutate...')
      if (editingRow) {
        await adminMutate(table, 'update', { id: editingRow.id, payload })
      } else {
        await adminMutate(table, 'insert', { payload })
      }
      
      console.log('B. Simpan database sukses! Memanggil onDone()...')
      if (typeof onDone === 'function') {
        onDone()
      } else {
        console.error('C. Error: Prop onDone bukan sebuah fungsi! Nilainya:', onDone)
      }
    } catch (err) {
      console.error('D. Gagal simpan DB (Error):', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div 
      className="admin-modal-overlay" 
      onClick={onCancel}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '12px'
      }}
    >
      <div 
        className="admin-modal-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px', width: '100%', padding: '20px', borderRadius: '16px',
          backgroundColor: '#ffffff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
            {editingRow ? '✏️ Edit' : '+ Tambah'} {TABLE_LABELS[table] || table}
          </h3>
          <button 
            onClick={onCancel} 
            type="button" 
            aria-label="Tutup"
            style={{ fontSize: '1rem', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Dynamic Form Grid */}
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {FIELD_CONFIG[table].map((field) => {
            const isFullWidth = field.type === 'textarea' || field.name === 'keterangan' || field.name === 'harga_saat_ini'
            const isCheckbox = field.type === 'checkbox'

            // Cek apakah field ini harus dikunci (disabled)
            const isDisabled = false

            if (isCheckbox) {
              return (
                <div key={field.name} style={{ gridColumn: 'span 1', display: 'flex', alignItems: 'center', paddingTop: '18px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!form[field.name]}
                      onChange={(e) => setForm({ ...form, [field.name]: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: '#16a34a' }}
                    />
                    {field.label}
                  </label>
                </div>
              )
            }

            return (
              <div key={field.name} style={{ gridColumn: isFullWidth ? '1 / -1' : 'span 1' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#475569', marginBottom: '3px' }}>
                  {field.label}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    rows={3}
                    value={form[field.name] ?? ''}
                    placeholder="Tulis pengumuman... link (https://...) otomatis jadi bisa diklik"
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    style={{
                      width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                      fontSize: '0.82rem', outline: 'none'
                    }}
                  />
                ) : (
                  <input
                    type={field.type}
                    step={field.type === 'number' ? 'any' : undefined}
                    value={form[field.name] ?? ''}
                    onChange={(e) => {
                      const val = field.type === 'text' && field.name === 'kode_saham' ? e.target.value.toUpperCase() : e.target.value
                      setForm({ ...form, [field.name]: val })
                    }}
                    disabled={isDisabled}
                    placeholder={isDisabled ? 'Otomatis dari DCA' : ''}
                    required={field.name !== 'keterangan' && field.name !== 'harga_saat_ini' && !isDisabled}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.82rem',
                      backgroundColor: isDisabled ? '#f8fafc' : '#ffffff',
                      cursor: isDisabled ? 'not-allowed' : 'text',
                      outline: 'none'
                    }}
                  />
                )}
              </div>
            )
          })}

          {error && (
            <p style={{ gridColumn: '1 / -1', color: '#ef4444', fontSize: '0.75rem', margin: '4px 0 0 0' }}>
              {error}
            </p>
          )}

          {/* Action Buttons */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px', borderRadius: '8px', border: 'none',
                backgroundColor: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px', borderRadius: '8px', border: 'none',
                backgroundColor: '#0f172a', color: '#ffffff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Menyimpan...' : editingRow ? '✓ Simpan Perubahan' : '+ Simpan Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
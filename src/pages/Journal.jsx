import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { adminMutate } from '../lib/adminApi'
import JournalForm from '../components/JournalForm' // Import form modal
import '../components/Journal.css'

// Komponen Card Satuan Jurnal (dengan Accordion)
// Komponen Card Satuan Jurnal (dengan Tampilan Metrik Lengkap)
function JournalCard({ item, isAdmin, onEdit, onDelete }) {
  if (!item) return null
  const [isOpen, setIsOpen] = useState(false)
  const m = item.metrik || {}

  // Cek apakah ada minimal salah satu rasio keuangan terisi
  const hasRatios = m.revenue_yoy || m.net_profit_yoy || m.npm || m.roe || m.der || m.per || m.pbv
  // Cek apakah ada minimal salah satu valuasi terisi
  const hasValuation = m.target_harga || m.fair_value || m.mos || m.dividen_yield

  return (
    <div
      className="journal-card"
      style={{
        background: '#fff',
        borderRadius: '10px',
        border: '1px solid #e2e8f0',
        padding: '1.25rem 1.5rem',
        marginBottom: '1rem',
        transition: 'all 0.2s ease',
      }}
    >
      {/* 1. Header Kartu */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>
            {isOpen ? '▼' : '▶'}
          </span>
          <span
            style={{
              fontWeight: 'bold',
              background: '#0f172a',
              color: '#fff',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.85rem',
            }}
          >
            {item.kode_saham}
          </span>
          <strong style={{ fontSize: '1.05rem', color: '#1e293b' }}>
            {item.nama_perusahaan}
          </strong>
          <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#64748b' }}>
            {(() => {
              if (!item.kuartal) return '—'
              const q = item.kuartal.match(/Q[1-4]/i)?.[0]?.toUpperCase()
              const yr = item.kuartal.match(/\d{4}/)?.[0]
              return q && yr ? `${q} ${yr}` : item.kuartal
            })()}
          </span>
        </div>

        <div
          style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}
          onClick={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.tanggal_update}</span>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn-sm btn-ghost" onClick={() => onEdit?.(item)}>Edit</button>
              <button className="btn-sm btn-danger" onClick={() => onDelete?.(item.id)}>Hapus</button>
            </div>
          )}
        </div>
      </div>

      {/* Preview Ringkas saat Posisi Tertutup */}
      {!isOpen && (
        <div
          style={{
            marginTop: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px dashed #f1f5f9',
            display: 'flex',
            gap: '1.2rem',
            fontSize: '0.82rem',
            color: '#64748b',
            cursor: 'pointer',
            flexWrap: 'wrap',
          }}
          onClick={() => setIsOpen(true)}
        >
          {m.target_harga && <span>🎯 Target: <strong style={{ color: '#0f172a' }}>{m.target_harga}</strong></span>}
          {m.fair_value && <span>💎 Fair Value: <strong style={{ color: '#0f172a' }}>{m.fair_value}</strong></span>}
          {m.revenue_yoy && <span>📈 Rev YoY: <strong style={{ color: '#0284c7' }}>{m.revenue_yoy}</strong></span>}
          {m.net_profit_yoy && <span>🚀 Profit YoY: <strong style={{ color: '#16a34a' }}>{m.net_profit_yoy}</strong></span>}
          {m.dividen_yield && <span>💰 Div Yield: <strong style={{ color: '#16a34a' }}>{m.dividen_yield}</strong></span>}
        </div>
      )}

      {/* 2. Detail Konten Lengkap */}
      {isOpen && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #e2e8f0' }}>
          
          {/* Tautan Dokumen / Video / Referensi */}
          {item.referensi && item.referensi.length > 0 && (
            <div
              style={{
                background: '#f8fafc',
                padding: '0.8rem 1rem',
                borderRadius: '8px',
                marginBottom: '1.2rem',
                border: '1px solid #e2e8f0',
              }}
            >
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Lampiran & Referensi Riset
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {item.referensi.map((ref, idx) => (
                  <div key={idx} style={{ fontSize: '0.88rem' }}>
                    <span>{ref.tipe === 'video' ? '🎬' : ref.tipe === 'dokumen' ? '📁' : '📰'} </span>
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {ref.label || ref.url}
                    </a>
                    {ref.sumber && <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}> — {ref.sumber}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid Rasio Finansial & Valuasi Lengkap */}
          {(hasRatios || hasValuation) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.6rem',
                }}
              >
                {/* 1. Valuasi */}
                {m.target_harga && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Target Harga</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.target_harga}</strong>
                  </div>
                )}
                {m.fair_value && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Fair Value</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.fair_value}</strong>
                  </div>
                )}
                {m.mos && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Margin of Safety</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.mos}</strong>
                  </div>
                )}
                {m.dividen_yield && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Div. Yield</span>
                    <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{m.dividen_yield}</strong>
                  </div>
                )}

                {/* 2. Pertumbuhan & Kinerja */}
                {m.revenue_yoy && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Revenue YoY</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0284c7' }}>{m.revenue_yoy}</strong>
                  </div>
                )}
                {m.net_profit_yoy && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Net Profit YoY</span>
                    <strong style={{ fontSize: '0.95rem', color: '#16a34a' }}>{m.net_profit_yoy}</strong>
                  </div>
                )}

                {/* 3. Profitabilitas & Neraca */}
                {m.npm && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>NPM (Margin)</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.npm}</strong>
                  </div>
                )}
                {m.roe && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>ROE</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.roe}</strong>
                  </div>
                )}
                {m.der && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>DER (Utang)</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.der}</strong>
                  </div>
                )}
                {m.per && (
                  <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '6px', border: '1px solid #edf2f7' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>PER / PBV</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{m.per}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Catatan Riset Naratif & Bukti Screenshot Lapkeu */}
          <div className="journal-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#334155' }}>
            {item.catatan_riset?.map((blok, i) => (
              <div key={i} style={{ marginBottom: '1.5rem' }}>
                {blok.paragraf && (
                  <p style={{ margin: '0 0 0.8rem 0', whiteSpace: 'pre-line' }}>{blok.paragraf}</p>
                )}
                {blok.gambar_lapkeu?.map((img, imgIdx) => (
                  <figure
                    key={imgIdx}
                    style={{
                      margin: '1rem 0',
                      textAlign: 'center',
                      background: '#f8fafc',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.caption || 'Screenshot Lapkeu'}
                      style={{
                        maxWidth: '100%',
                        height: 'auto',
                        borderRadius: '6px',
                        display: 'inline-block',
                      }}
                    />
                    {img.caption && (
                      <figcaption style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.4rem', fontWeight: 500 }}>
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '400px',
          padding: '1.5rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#0f172a', fontSize: '1.1rem' }}>
          {title || 'Konfirmasi Hapus'}
        </h4>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
          {message || 'Data yang dihapus tidak bisa dikembalikan.'}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
          <button
            type="button"
            className="btn-sm btn-ghost"
            style={{ minWidth: '80px', padding: '0.45rem 1rem' }}
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            type="button"
            className="btn-sm btn-danger"
            style={{ minWidth: '80px', padding: '0.45rem 1rem' }}
            onClick={onConfirm}
          >
            Ya, Hapus
          </button>
        </div>
      </div>
    </div>
  )
}

// Container Utama Jurnal
export default function Journal({ isAdmin = false }) {
  const [selectedQuarter, setSelectedQuarter] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [journalData, setJournalData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // State Modal Form & Modal Konfirmasi Hapus
  const [formEditingRow, setFormEditingRow] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Fetch data dari tabel Supabase
  async function fetchJournalEntries() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('journal_entries')
        .select('*')
        .order('tanggal_update', { ascending: false })

      if (fetchErr) throw fetchErr
      setJournalData(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJournalEntries()
  }, [])

  // Eksekusi hapus setelah dikonfirmasi via ConfirmModal
  async function executeDelete() {
    if (!deletingId) return
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', deletingId)

      if (error) throw error
      setDeletingId(null)
      fetchJournalEntries()
    } catch (err) {
      alert('Gagal menghapus: ' + err.message)
    }
  }

  const handleFormDone = () => {
    setFormEditingRow(null)
    fetchJournalEntries()
  }

  // Ekstrak dan rapikan kuartal unik
  const rawQuarters = [
    ...new Set(
      journalData
        .map((d) => {
          if (!d.kuartal) return null
          const qMatch = d.kuartal.match(/Q[1-4]/i)?.[0]?.toUpperCase()
          const yearMatch = d.kuartal.match(/\d{4}/)?.[0]
          return qMatch && yearMatch ? `${qMatch} ${yearMatch}` : d.kuartal
        })
        .filter(Boolean)
    ),
  ]

  // Urutkan dari tahun terbaru dan kuartal tertinggi (Q4 -> Q1)
  rawQuarters.sort((a, b) => {
    const [qA, yearA] = a.split(' ')
    const [qB, yearB] = b.split(' ')
    if (Number(yearB) !== Number(yearA)) {
      return (Number(yearB) || 0) - (Number(yearA) || 0)
    }
    return b.localeCompare(a)
  })

  const quarters = ['Semua', ...rawQuarters]

  // Logika Filter & Search Bar
  const filteredData = journalData.filter((item) => {
    if (!item) return false

    const matchQuarter = selectedQuarter === 'Semua' || item.kuartal === selectedQuarter
    const q = searchQuery.toLowerCase().trim()
    if (!q) return matchQuarter

    const kode = (item.kode_saham || '').toLowerCase()
    const nama = (item.nama_perusahaan || '').toLowerCase()
    const kuartalText = (item.kuartal || '').toLowerCase()

    const matchKonten = Array.isArray(item.catatan_riset) && item.catatan_riset.some((c) => {
      const p = (c?.paragraf || '').toLowerCase().includes(q)
      const cap = Array.isArray(c?.gambar_lapkeu) && c.gambar_lapkeu.some(img => 
        (img?.caption || '').toLowerCase().includes(q)
      )
      return p || cap
    })

    const matchKeyword = kode.includes(q) || nama.includes(q) || kuartalText.includes(q) || matchKonten
    return selectedQuarter === 'Semua' ? matchKeyword : (matchQuarter && matchKeyword)
  })

  return (
    <div className="journal-page" style={{ marginTop: '1.5rem' }}>
      {/* Modal Konfirmasi Hapus */}
      <ConfirmModal
        isOpen={deletingId !== null}
        title="Hapus Catatan Jurnal?"
        message="Catatan riset emiten ini beserta lampirannya akan dihapus permanen."
        onConfirm={executeDelete}
        onCancel={() => setDeletingId(null)}
      />

      {/* Modal Form Tambah / Edit */}
      {formEditingRow !== null && (
        <JournalForm
          editingRow={Object.keys(formEditingRow).length > 0 ? formEditingRow : null}
          onDone={handleFormDone}
          onCancel={() => setFormEditingRow(null)}
        />
      )}

      {/* Header Bar: Search, Filter, & Tombol Tambah (Admin) */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          marginBottom: '1.5rem',
        }}
      >
        {/* Search Bar */}
        <div style={{ flex: '1', minWidth: '220px', maxWidth: '360px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Cari kode saham, nama, atau analisa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.9rem 0.55rem 2.2rem',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.88rem',
              outline: 'none',
              background: '#fff',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '0.9rem',
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Kuartal & Tombol Tambah */}
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {quarters.map((q) => (
              <button
                key={q}
                type="button"
                className={`btn-sm ${selectedQuarter === q ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setSelectedQuarter(q)}
              >
                {q}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              className="btn-sm btn-primary"
              onClick={() => setFormEditingRow({})}
            >
              + Tambah Jurnal
            </button>
          )}
        </div>
      </div>

      {/* State Loading & Error */}
      {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>Memuat catatan jurnal...</p>}
      {error && <p style={{ textAlign: 'center', color: '#ef4444' }}>Gagal memuat: {error}</p>}

      {/* Daftar Jurnal */}
      {!loading && !error && filteredData.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: '#fff',
            borderRadius: '10px',
            border: '1px dashed #cbd5e1',
          }}
        >
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>
            Belum ada catatan riset jurnal.
          </p>
        </div>
      )}

      {!loading &&
        !error &&
        filteredData.map((item) => (
          <JournalCard
            key={item.id}
            item={item}
            isAdmin={isAdmin}
            onEdit={(data) => setFormEditingRow(data)}
            onDelete={(id) => setDeletingId(id)}
          />
        ))}
    </div>
  )
}
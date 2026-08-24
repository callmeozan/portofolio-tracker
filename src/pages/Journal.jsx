import React, { useState, useEffect } from 'react'
import katex from 'katex'
import { supabase } from '../lib/supabaseClient'
import JournalForm from '../components/JournalForm'
import '../components/Journal.css'
import TickerBadge from '../components/TickerBadge'

// Helper untuk merender teks + rumus KaTeX
function RenderContent({ content }) {
  if (!content) return null
  const parts = content.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g)

  return (
    <span>
      {parts.map((part, index) => {
        if (!part) return null

        if (part.startsWith('$$') && part.endsWith('$$')) {
          const rawMath = part.slice(2, -2).trim()
          try {
            const html = katex.renderToString(rawMath, { displayMode: true, throwOnError: false })
            return (
              <div
                key={index}
                style={{ margin: '0.8rem 0', overflowX: 'auto' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )
          } catch (e) {
            return <span key={index}>{part}</span>
          }
        }

        if (part.startsWith('$') && part.endsWith('$')) {
          const rawMath = part.slice(1, -1).trim()
          try {
            const html = katex.renderToString(rawMath, { displayMode: false, throwOnError: false })
            return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />
          } catch (e) {
            return <span key={index}>{part}</span>
          }
        }

        return <span key={index} style={{ whiteSpace: 'pre-line' }}>{part}</span>
      })}
    </span>
  )
}

// Container Kisi-Kisi Rumus Analisa Fundamental
// Helper item kartu rumus (Bisa digeser halus tanpa kepotong)
function FormulaItem({ title, formula, note, color = 'var(--ink)' }) {
  const [html, setHtml] = useState('')

  useEffect(() => {
    try {
      const rendered = katex.renderToString(formula, {
        displayMode: true,
        throwOnError: false,
      })
      setHtml(rendered)
    } catch {
      setHtml('')
    }
  }, [formula])

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '8px',
        padding: '0.75rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <span style={{ fontSize: '0.78rem', fontWeight: 600, color, marginBottom: '0.35rem' }}>
        {title}
      </span>

      {/* Area rumus yang bisa di-scroll dengan font natural */}
      <div
        style={{
          margin: '0.3rem 0',
          overflowX: 'auto',
          fontSize: '0.88rem',
          textAlign: 'center',
          scrollbarWidth: 'thin', // Firefox scrollbar tipis
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {note && (
        <span style={{ fontSize: '0.68rem', color: 'var(--ink-soft)', marginTop: '0.35rem', textAlign: 'center', lineHeight: '1.2' }}>
          {note}
        </span>
      )}
    </div>
  )
}

// Container Cheatsheet Rumus
function CheatSheetBox() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        padding: '0.9rem 1.2rem',
        marginBottom: '1.25rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📐</span>
          <strong style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>
            Cheatsheet & Rumus Analisa Fundamental
          </strong>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 600 }}>
          {isExpanded ? 'Tutup ▲' : 'Buka Rumus ▼'}
        </span>
      </div>

      {isExpanded && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--line)' }}>
          
          {/* 1. Rasio Universal & Laba */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
              📊 Rasio Universal & Laba
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
              <FormulaItem
                title="Net Profit Growth (YoY)"
                formula="\text{Growth (\%)} = \frac{\text{Laba Sekarang} - \text{Laba Lalu}}{|\text{Laba Lalu}|} \times 100"
                note="Pertumbuhan laba bersih tahunan"
              />
              <FormulaItem
                title="Return on Equity (ROE)"
                formula="\text{ROE (\%)} = \frac{\text{Laba Induk (Disetahunkan)}}{\text{Total Ekuitas}} \times 100"
                note="Q1 ×4 | Q2 ×2 | Q3 ×(4/3) | FY ×1"
              />
              <FormulaItem
                title="Net Profit Margin (NPM)"
                formula="\text{NPM (\%)} = \frac{\text{Laba Bersih}}{\text{Total Pendapatan}} \times 100"
                note="Efisiensi margin laba operasional"
              />
              <FormulaItem
                title="Debt to Equity Ratio (DER)"
                formula="\text{DER (x)} = \frac{\text{Total Liabilitas}}{\text{Total Ekuitas}}"
                note="Porsi utang terhadap modal bersih"
              />
            </div>
          </div>

          {/* 2. Metrik Valuasi & Pasar */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
              💎 Metrik Valuasi & Harga Pasar
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
              <FormulaItem
                title="Price to Earnings (PER)"
                formula="\text{PER (x)} = \frac{\text{Harga Saham}}{\text{EPS (Annualized)}}"
                note="Rasio harga terhadap laba per lembar"
                color="#10b981"
              />
              <FormulaItem
                title="Price to Book Value (PBV)"
                formula="\text{PBV (x)} = \frac{\text{Harga Saham}}{\text{BVPS}}"
                note="Rasio harga terhadap nilai buku modal"
                color="#10b981"
              />
              <FormulaItem
                title="Fair Value (Harga Wajar)"
                formula="\text{Fair Value} = \text{Mean PBV Historis} \times \text{BVPS}"
                note="Valuasi wajar berbasis rata-rata PBV historis"
                color="#10b981"
              />
              <FormulaItem
                title="Margin of Safety (MoS)"
                formula="\text{MoS (\%)} = \frac{\text{Fair Value} - \text{Harga Saham}}{\text{Fair Value}} \times 100"
                note="Diskon pengaman beli terhadap nilai wajar"
                color="#10b981"
              />
              <FormulaItem
                title="Estimasi Dividend Yield"
                formula="\text{Div. Yield (\%)} = \frac{\text{EPS} \times \text{DPR (\%)}}{\text{Harga Saham}} \times 100"
                note="Estimasi persentase dividen tahunan terhadap harga beli"
                color="#10b981"
              />
            </div>
          </div>

          {/* 3. Rasio Khusus Perbankan */}
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.6rem' }}>
              🏦 Rasio Khusus Perbankan
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.75rem' }}>
              <FormulaItem
                title="CASA Ratio (Dana Murah)"
                formula="\text{CASA (\%)} = \frac{\text{Giro} + \text{Tabungan}}{\text{Total DPK}} \times 100"
                note="Makin tinggi (>60%), beban bunga bank hemat"
                color="#38bdf8"
              />
              <FormulaItem
                title="NPL Gross (Kredit Macet)"
                formula="\text{NPL (\%)} = \frac{\text{Kredit Bermasalah (KL+D+M)}}{\text{Total Kredit}} \times 100"
                note="Batas aman OJK < 5%, bank sehat < 2%"
                color="#38bdf8"
              />
              <FormulaItem
                title="Net Interest Margin (NIM)"
                formula="\text{NIM (\%)} = \frac{\text{Pendapatan Bunga Bersih (NII)}}{\text{Rata-rata Aset Produktif}} \times 100"
                note="Ketebalan margin bunga bersih"
                color="#38bdf8"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// Komponen Card Satuan Jurnal
function JournalCard({ item, isAdmin, onEdit, onDelete }) {
  if (!item) return null
  const [isOpen, setIsOpen] = useState(false)
  const m = item.metrik || {}

  const hasRatios = m.revenue_yoy || m.net_profit_yoy || m.npm || m.roe || m.der || m.per || m.pbv || m.casa || m.nim || m.npl_gross
  const hasValuation = m.target_harga || m.fair_value || m.mos || m.dividen_yield

  return (
    <div
      className="journal-card"
      style={{
        background: 'var(--card-bg)',
        borderRadius: '10px',
        border: '1px solid var(--line)',
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
          alignItems: 'flex-start',
          gap: '0.75rem',
          cursor: 'pointer',
          userSelect: 'none',
          flexWrap: 'wrap',
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: '1 1 200px', minWidth: 0 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--ink-soft)', fontWeight: 'bold' }}>
            {isOpen ? '▼' : '▶'}
          </span>

          <div
            className="journal-ticker-logo"
            style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
              minHeight: '34px',
              borderRadius: '50%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--line)',
              flexShrink: 0,
            }}
          >
            <TickerBadge kode={item.kode_saham} size={34} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.98rem', color: 'var(--ink)', lineHeight: '1.3', wordBreak: 'break-word' }}>
              {item.nama_perusahaan}
            </strong>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: 'var(--ink-soft)', fontSize: '0.82rem', letterSpacing: '0.5px' }}>
                {item.kode_saham}
              </span>
              <span style={{ color: 'var(--line)', fontSize: '0.8rem' }}>•</span>
              <span style={{ fontSize: '0.75rem', background: 'var(--surface)', padding: '0.1rem 0.45rem', borderRadius: '4px', color: 'var(--ink-soft)' }}>
                {(() => {
                  if (!item.kuartal) return '—'
                  const q = item.kuartal.match(/Q[1-4]/i)?.[0]?.toUpperCase()
                  const yr = item.kuartal.match(/\d{4}/)?.[0]
                  return q && yr ? `${q} ${yr}` : item.kuartal
                })()}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <span style={{ fontSize: '0.82rem', color: 'var(--ink-soft)' }}>{item.tanggal_update}</span>
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
            borderTop: '1px dashed var(--line)',
            display: 'flex',
            gap: '1.2rem',
            fontSize: '0.82rem',
            color: 'var(--ink-soft)',
            cursor: 'pointer',
            flexWrap: 'wrap',
          }}
          onClick={() => setIsOpen(true)}
        >
          {m.target_harga && <span>🎯 Target: <strong style={{ color: 'var(--ink)' }}>{m.target_harga}</strong></span>}
          {m.fair_value && <span>💎 Fair Value: <strong style={{ color: 'var(--ink)' }}>{m.fair_value}</strong></span>}
          {m.revenue_yoy && <span>📈 Rev YoY: <strong style={{ color: '#0284c7' }}>{m.revenue_yoy}</strong></span>}
          {m.net_profit_yoy && <span>🚀 Profit YoY: <strong className="gain">{m.net_profit_yoy}</strong></span>}
          {m.npm && <span>📊 NPM: <strong style={{ color: 'var(--ink)' }}>{m.npm}</strong></span>}
          {m.roe && <span>⚡ ROE: <strong style={{ color: 'var(--ink)' }}>{m.roe}</strong></span>}
          {m.der && <span>⚖️ DER: <strong style={{ color: 'var(--ink)' }}>{m.der}</strong></span>}
          {m.casa && <span>🏦 CASA: <strong style={{ color: '#38bdf8' }}>{m.casa}</strong></span>}
          {m.npl_gross && <span>🛡️ NPL: <strong style={{ color: 'var(--ink)' }}>{m.npl_gross}</strong></span>}
          {m.dividen_yield && <span>💰 Div Yield: <strong className="gain">{m.dividen_yield}</strong></span>}
        </div>
      )}

      {/* 2. Detail Konten Lengkap */}
      {isOpen && (
        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--line)' }}>
          
          {/* Tautan Dokumen / Referensi */}
          {item.referensi && item.referensi.length > 0 && (
            <div style={{ background: 'var(--surface)', padding: '0.8rem 1rem', borderRadius: '8px', marginBottom: '1.2rem', border: '1px solid var(--line)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--ink-soft)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                Lampiran & Referensi Riset
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {item.referensi.map((ref, idx) => (
                  <div key={idx} style={{ fontSize: '0.88rem' }}>
                    <span>{ref.tipe === 'video' ? '🎬' : ref.tipe === 'dokumen' ? '📁' : '📰'} </span>
                    <a href={ref.url} target="_blank" rel="noopener noreferrer" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 500 }}>
                      {ref.label || ref.url}
                    </a>
                    {ref.sumber && <span style={{ color: 'var(--ink-soft)', fontSize: '0.8rem' }}> — {ref.sumber}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grid Rasio Finansial & Valuasi */}
          {(hasRatios || hasValuation) && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
                {m.target_harga && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Target Harga</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.target_harga}</strong>
                  </div>
                )}
                {m.fair_value && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Fair Value</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.fair_value}</strong>
                  </div>
                )}
                {m.mos && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Margin of Safety</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.mos}</strong>
                  </div>
                )}
                {m.dividen_yield && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Div. Yield</span>
                    <strong className="gain" style={{ fontSize: '0.95rem' }}>{m.dividen_yield}</strong>
                  </div>
                )}
                {m.revenue_yoy && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Revenue YoY</span>
                    <strong style={{ fontSize: '0.95rem', color: '#0284c7' }}>{m.revenue_yoy}</strong>
                  </div>
                )}
                {m.net_profit_yoy && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>Net Profit YoY</span>
                    <strong className="gain" style={{ fontSize: '0.95rem' }}>{m.net_profit_yoy}</strong>
                  </div>
                )}
                {m.npm && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>NPM (Margin)</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.npm}</strong>
                  </div>
                )}
                {m.roe && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>ROE</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.roe}</strong>
                  </div>
                )}
                {m.der && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>DER (Utang)</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.der}</strong>
                  </div>
                )}
                {m.casa && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'block' }}>CASA Ratio</span>
                    <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{m.casa}</strong>
                  </div>
                )}
                {m.nim && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'block' }}>NIM</span>
                    <strong style={{ fontSize: '0.95rem', color: '#38bdf8' }}>{m.nim}</strong>
                  </div>
                )}
                {m.npl_gross && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>NPL Gross</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>{m.npl_gross}</strong>
                  </div>
                )}
                {m.per && (
                  <div style={{ background: 'var(--surface)', padding: '0.7rem', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--ink-soft)', display: 'block' }}>PER / PBV</span>
                    <strong style={{ fontSize: '0.95rem', color: 'var(--ink)' }}>
                      {m.per && m.pbv && !m.per.includes('|')
                        ? `PER ${m.per} | PBV ${m.pbv}`
                        : (m.per || '-')}
                    </strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Catatan Riset & KaTeX Render */}
          <div className="journal-content" style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--ink)' }}>
            {item.catatan_riset?.map((blok, i) => (
              <div key={i} style={{ marginBottom: '1.5rem' }}>
                {blok.paragraf && (
                  <div style={{ margin: '0 0 1rem 0', lineHeight: '1.7' }}>
                    <RenderContent content={blok.paragraf} />
                  </div>
                )}
                {blok.gambar_lapkeu?.map((img, imgIdx) => (
                  <figure
                    key={imgIdx}
                    style={{
                      margin: '1rem 0',
                      textAlign: 'center',
                      background: 'var(--surface)',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      border: '1px solid var(--line)',
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.caption || 'Screenshot Lapkeu'}
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '6px', display: 'inline-block' }}
                    />
                    {img.caption && (
                      <figcaption style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', marginTop: '0.4rem', fontWeight: 500 }}>
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
    <div className="admin-modal-overlay" onClick={onCancel}>
      <div className="admin-modal-card modal-sm" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--ink)', fontSize: '1.1rem' }}>
          {title || 'Konfirmasi Hapus'}
        </h4>
        <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
          {message || 'Data yang dihapus tidak bisa dikembalikan.'}
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
          <button type="button" className="btn-sm btn-ghost" style={{ minWidth: '80px', padding: '0.45rem 1rem' }} onClick={onCancel}>
            Batal
          </button>
          <button type="button" className="btn-sm" style={{ minWidth: '80px', padding: '0.45rem 1rem', background: 'var(--loss)', color: '#fff', border: 'none' }} onClick={onConfirm}>
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

  const [formEditingRow, setFormEditingRow] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

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

  rawQuarters.sort((a, b) => {
    const [qA, yearA] = a.split(' ')
    const [qB, yearB] = b.split(' ')
    if (Number(yearB) !== Number(yearA)) {
      return (Number(yearB) || 0) - (Number(yearA) || 0)
    }
    return b.localeCompare(a)
  })

  const quarters = ['Semua', ...rawQuarters]

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
      const cap = Array.isArray(c?.gambar_lapkeu) && c.gambar_lapkeu.some((img) =>
        (img?.caption || '').toLowerCase().includes(q)
      )
      return p || cap
    })

    const matchKeyword = kode.includes(q) || nama.includes(q) || kuartalText.includes(q) || matchKonten
    return selectedQuarter === 'Semua' ? matchKeyword : (matchQuarter && matchKeyword)
  })

  return (
    <div className="journal-page" style={{ marginTop: '1.5rem' }}>
      {/* Box Cheatsheet Kisi-Kisi Rumus Teratas */}
      <CheatSheetBox />

      <ConfirmModal
        isOpen={deletingId !== null}
        title="Hapus Catatan Jurnal?"
        message="Catatan riset emiten ini beserta lampirannya akan dihapus permanen."
        onConfirm={executeDelete}
        onCancel={() => setDeletingId(null)}
      />

      {formEditingRow !== null && (
        <JournalForm
          editingRow={Object.keys(formEditingRow).length > 0 ? formEditingRow : null}
          onDone={handleFormDone}
          onCancel={() => setFormEditingRow(null)}
        />
      )}

      {/* Header Bar: Search, Filter, & Tombol Tambah */}
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
              fontSize: '0.88rem',
              outline: 'none',
            }}
          />
          <span
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-soft)',
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
                color: 'var(--ink-soft)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ✕
            </button>
          )}
        </div>

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

      {loading && <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Memuat catatan jurnal...</p>}
      {error && <p style={{ textAlign: 'center', color: 'var(--loss)' }}>Gagal memuat: {error}</p>}

      {!loading && !error && filteredData.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            background: 'var(--card-bg)',
            borderRadius: '10px',
            border: '1px dashed var(--line)',
          }}
        >
          <p style={{ color: 'var(--ink-soft)', margin: 0, fontSize: '0.95rem' }}>
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
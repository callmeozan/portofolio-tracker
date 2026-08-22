import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function JournalForm({ editingRow, onDone, onCancel }) {
  const [submitting, setSubmitting] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState(null)

  // Header & Info Umum
  const [kodeSaham, setKodeSaham] = useState(editingRow?.kode_saham || '')
  const [namaPerusahaan, setNamaPerusahaan] = useState(editingRow?.nama_perusahaan || '')
  const initialQ = (editingRow?.kuartal?.match(/Q[1-4]/i)?.[0] || 'Q1').toUpperCase()
  const [kuartal, setKuartal] = useState(initialQ)
  const [tanggalUpdate, setTanggalUpdate] = useState(
    editingRow?.tanggal_update || new Date().toISOString().slice(0, 10)
  )

  // Metrik Valuasi & Rasio Umum
  const [targetHarga, setTargetHarga] = useState(editingRow?.metrik?.target_harga || '')
  const [fairValue, setFairValue] = useState(editingRow?.metrik?.fair_value || '')
  const [mos, setMos] = useState(editingRow?.metrik?.mos || '')
  const [dividenYield, setDividenYield] = useState(editingRow?.metrik?.dividen_yield || '')
  const [revenueYoy, setRevenueYoy] = useState(editingRow?.metrik?.revenue_yoy || '')
  const [netProfitYoy, setNetProfitYoy] = useState(editingRow?.metrik?.net_profit_yoy || '')
  const [npm, setNpm] = useState(editingRow?.metrik?.npm || '')
  const [roe, setRoe] = useState(editingRow?.metrik?.roe || '')
  const [der, setDer] = useState(editingRow?.metrik?.der || '')
  const [per, setPer] = useState(editingRow?.metrik?.per || '')
  const [pbv, setPbv] = useState(editingRow?.metrik?.pbv || '')

  // Metrik Khusus Perbankan (Opsional)
  const [casa, setCasa] = useState(editingRow?.metrik?.casa || '')
  const [nim, setNim] = useState(editingRow?.metrik?.nim || '')
  const [nplGross, setNplGross] = useState(editingRow?.metrik?.npl_gross || '')

  // State Input Mentah Lapkeu untuk Auto-Calculate
  const [rawLiabilitas, setRawLiabilitas] = useState('')
  const [rawEkuitas, setRawEkuitas] = useState('')
  const [rawLabaSekarang, setRawLabaSekarang] = useState('')
  const [rawLabaLalu, setRawLabaLalu] = useState('')

  // Referensi & Catatan Riset
  const [referensi, setReferensi] = useState(
    editingRow?.referensi || [{ tipe: 'dokumen', label: '', url: '', sumber: '' }]
  )
  const [catatanRiset, setCatatanRiset] = useState(
    editingRow?.catatan_riset || [{ paragraf: '', gambar_lapkeu: [] }]
  )

  const autoCalculateRatios = (liab, eku, labaNow, labaPast, q) => {
    const l = parseFloat(liab)
    const e = parseFloat(eku)
    const lp = parseFloat(labaNow)
    const lpast = parseFloat(labaPast)

    if (!isNaN(l) && !isNaN(e) && e !== 0) {
      setDer((l / e).toFixed(2) + 'x')
    }

    if (!isNaN(lp) && !isNaN(e) && e !== 0) {
      let multiplier = 1
      if (q.includes('Q1')) multiplier = 4
      else if (q.includes('Q2')) multiplier = 2
      else if (q.includes('Q3')) multiplier = 4 / 3

      const roeVal = ((lp * multiplier) / e) * 100
      setRoe(roeVal.toFixed(2) + '%')
    }

    if (!isNaN(lp) && !isNaN(lpast) && lpast !== 0) {
      const yoyVal = ((lp - lpast) / Math.abs(lpast)) * 100
      const sign = yoyVal > 0 ? '+' : ''
      setNetProfitYoy(`${sign}${yoyVal.toFixed(2)}%`)
    }
  }

  const handleAddBlok = () => {
    setCatatanRiset([...catatanRiset, { paragraf: '', gambar_lapkeu: [] }])
  }

  const handleRemoveBlok = (index) => {
    setCatatanRiset(catatanRiset.filter((_, i) => i !== index))
  }

  const handleParagrafChange = (index, value) => {
    const next = [...catatanRiset]
    next[index].paragraf = value
    setCatatanRiset(next)
  }

  const handleUploadImage = async (blokIndex, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingIndex(blokIndex)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${(kodeSaham || 'lapkeu').toUpperCase()}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('journal-images')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('journal-images')
        .getPublicUrl(fileName)

      const next = [...catatanRiset]
      next[blokIndex].gambar_lapkeu.push({
        url: publicUrlData.publicUrl,
        caption: '',
      })
      setCatatanRiset(next)
    } catch (err) {
      alert('Gagal upload gambar: ' + err.message)
    } finally {
      setUploadingIndex(null)
      e.target.value = null
    }
  }

  const handleCaptionChange = (blokIndex, imgIndex, caption) => {
    const next = [...catatanRiset]
    next[blokIndex].gambar_lapkeu[imgIndex].caption = caption
    setCatatanRiset(next)
  }

  const handleRemoveImage = (blokIndex, imgIndex) => {
    const next = [...catatanRiset]
    next[blokIndex].gambar_lapkeu = next[blokIndex].gambar_lapkeu.filter((_, i) => i !== imgIndex)
    setCatatanRiset(next)
  }

  const handleAddRef = () => {
    setReferensi([...referensi, { tipe: 'dokumen', label: '', url: '', sumber: '' }])
  }

  const handleRefChange = (idx, field, value) => {
    const next = [...referensi]
    next[idx][field] = value
    setReferensi(next)
  }

  const handleRemoveRef = (idx) => {
    setReferensi(referensi.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const cleanQ = (kuartal.match(/Q[1-4]/i)?.[0] || 'Q1').toUpperCase()
    const tahunRilis = new Date(tanggalUpdate).getFullYear() || new Date().getFullYear()
    const formattedKuartal = `${cleanQ} ${tahunRilis}`

    const payload = {
      kode_saham: kodeSaham.toUpperCase().trim(),
      nama_perusahaan: namaPerusahaan.trim(),
      kuartal: formattedKuartal,
      tanggal_update: tanggalUpdate,
      metrik: {
        target_harga: targetHarga,
        fair_value: fairValue,
        mos: mos,
        dividen_yield: dividenYield,
        revenue_yoy: revenueYoy,
        net_profit_yoy: netProfitYoy,
        npm: npm,
        roe: roe,
        der: der,
        per: per,
        pbv: pbv,
        casa: casa,
        nim: nim,
        npl_gross: nplGross,
      },
      referensi: referensi.filter((r) => r.url.trim() !== ''),
      catatan_riset: catatanRiset.filter((c) => c.paragraf.trim() !== '' || c.gambar_lapkeu.length > 0),
    }

    try {
      if (editingRow?.id) {
        const { error } = await supabase
          .from('journal_entries')
          .update(payload)
          .eq('id', editingRow.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('journal_entries')
          .insert([payload])

        if (error) throw error
      }

      onDone()
    } catch (err) {
      alert('Gagal menyimpan jurnal: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '0.6rem 0.8rem',
    borderRadius: '7px',
    border: '1px solid var(--line)',
    background: 'var(--surface)',
    color: 'var(--ink)',
    fontSize: '0.86rem',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const cardSectionStyle = {
    background: 'var(--card-bg)',
    border: '1px solid var(--line)',
    borderRadius: '10px',
    padding: '1.2rem',
    marginBottom: '1.3rem',
  }

  return (
    <div className="admin-modal-overlay">
      <div
        className="admin-modal-card"
        style={{
          maxWidth: '920px',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg)',
          border: '1px solid var(--line)',
          borderRadius: '12px',
          padding: '1.75rem',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Title */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>{editingRow?.id ? '✏️' : '📝'}</span>
            <h3 style={{ margin: 0, color: 'var(--ink)', fontSize: '1.2rem', fontWeight: 700 }}>
              {editingRow?.id ? 'Edit Jurnal Fundamental' : 'Tambah Jurnal Fundamental Baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.2rem',
              cursor: 'pointer',
              padding: '0.2rem 0.5rem',
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Info Umum */}
          <div style={cardSectionStyle}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.8rem' }}>
              📌 Informasi Emiten
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Kode Saham
                </label>
                <input
                  type="text"
                  required
                  placeholder="BMRI"
                  value={kodeSaham}
                  onChange={(e) => setKodeSaham(e.target.value.toUpperCase())}
                  style={inputStyle}
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Nama Perusahaan
                </label>
                <input
                  type="text"
                  required
                  placeholder="PT. Bank Mandiri (Persero) Tbk."
                  value={namaPerusahaan}
                  onChange={(e) => setNamaPerusahaan(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Kuartal
                </label>
                <select
                  value={kuartal}
                  onChange={(e) => {
                    setKuartal(e.target.value)
                    autoCalculateRatios(rawLiabilitas, rawEkuitas, rawLabaSekarang, rawLabaLalu, e.target.value)
                  }}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="Q1">Q1 (Kuartal 1)</option>
                  <option value="Q2">Q2 (Kuartal 2)</option>
                  <option value="Q3">Q3 (Kuartal 3)</option>
                  <option value="Q4">Q4 (Full Year)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.35rem' }}>
                  Tanggal Rilis / Update
                </label>
                <input
                  type="date"
                  required
                  value={tanggalUpdate}
                  onChange={(e) => setTanggalUpdate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Auto Calculate Ratios */}
          <div
            style={{
              ...cardSectionStyle,
              background: 'rgba(2, 132, 199, 0.05)',
              border: '1px dashed rgba(56, 189, 248, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <strong style={{ fontSize: '0.88rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                ⚡ Auto-Calculate dari Angka Mentah Lapkeu
              </strong>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                Ketik langsung angka dari PDF (tanpa titik ribuan)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Total Liabilitas (Utang)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="2234540"
                  value={rawLiabilitas}
                  onChange={(e) => {
                    const v = e.target.value
                    setRawLiabilitas(v)
                    autoCalculateRatios(v, rawEkuitas, rawLabaSekarang, rawLabaLalu, kuartal)
                  }}
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Total Ekuitas (Modal)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="293020"
                  value={rawEkuitas}
                  onChange={(e) => {
                    const v = e.target.value
                    setRawEkuitas(v)
                    autoCalculateRatios(rawLiabilitas, v, rawLabaSekarang, rawLabaLalu, kuartal)
                  }}
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Laba Induk (Periode Ini)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="30412"
                  value={rawLabaSekarang}
                  onChange={(e) => {
                    const v = e.target.value
                    setRawLabaSekarang(v)
                    autoCalculateRatios(rawLiabilitas, rawEkuitas, v, rawLabaLalu, kuartal)
                  }}
                  style={inputStyle}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
                  Laba Induk (Tahun Lalu)
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="24455"
                  value={rawLabaLalu}
                  onChange={(e) => {
                    const v = e.target.value
                    setRawLabaLalu(v)
                    autoCalculateRatios(rawLiabilitas, rawEkuitas, rawLabaSekarang, v, kuartal)
                  }}
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Rasio Finansial & Valuasi */}
          <div style={cardSectionStyle}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.8rem' }}>
              📊 Rasio Keuangan & Metrik Valuasi
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.9rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Revenue YoY
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>((Rev Ini - Rev Lalu) / Rev Lalu) × 100%</span>
                </label>
                <input type="text" placeholder="+12.5%" value={revenueYoy} onChange={(e) => setRevenueYoy(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Net Profit YoY
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>((Laba Ini - Lalu) / Lalu) × 100%</span>
                </label>
                <input type="text" placeholder="+24.0%" value={netProfitYoy} onChange={(e) => setNetProfitYoy(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  NPM (Margin)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>(Laba Bersih / Revenue) × 100%</span>
                </label>
                <input type="text" placeholder="14.2%" value={npm} onChange={(e) => setNpm(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  ROE (Annualized)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>(Laba Disetahunkan / Modal) × 100%</span>
                </label>
                <input type="text" placeholder="18.5%" value={roe} onChange={(e) => setRoe(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  DER (Utang / Modal)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Total Liabilitas / Total Ekuitas</span>
                </label>
                <input type="text" placeholder="0.45x" value={der} onChange={(e) => setDer(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  PER / PBV
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Harga / EPS | Harga / BVPS</span>
                </label>
                <input type="text" placeholder="PER 8.5x | PBV 1.2x" value={per} onChange={(e) => setPer(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Target Harga
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Target TP / Exit</span>
                </label>
                <input type="text" placeholder="Rp 1.050" value={targetHarga} onChange={(e) => setTargetHarga(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Fair Value
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Valuasi wajar</span>
                </label>
                <input type="text" placeholder="Rp 1.200" value={fairValue} onChange={(e) => setFairValue(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Margin of Safety (MoS)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>((FV - Harga) / FV) × 100%</span>
                </label>
                <input type="text" placeholder="25%" value={mos} onChange={(e) => setMos(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  Div. Yield Est.
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>(Estimasi DPS / Harga) × 100%</span>
                </label>
                <input type="text" placeholder="6.2%" value={dividenYield} onChange={(e) => setDividenYield(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Section 4: Rasio Khusus Perbankan */}
          <div
            style={{
              ...cardSectionStyle,
              background: 'rgba(56, 189, 248, 0.03)',
              border: '1px solid rgba(56, 189, 248, 0.18)',
            }}
          >
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '0.8rem' }}>
              🏦 Rasio Khusus Perbankan (Opsional)
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.9rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  CASA Ratio (%)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>((Giro + Tabungan) / DPK) × 100%</span>
                </label>
                <input type="text" placeholder="69.19%" value={casa} onChange={(e) => setCasa(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  NIM (%)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>NII Disetahunkan / Rata-rata Aset</span>
                </label>
                <input type="text" placeholder="5.12%" value={nim} onChange={(e) => setNim(e.target.value)} style={inputStyle} />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: '0.2rem' }}>
                  NPL Gross (%)
                  <span style={{ display: 'block', fontSize: '0.68rem', color: '#94a3b8', fontWeight: 400 }}>Kredit Macet / Total Kredit</span>
                </label>
                <input type="text" placeholder="1.01%" value={nplGross} onChange={(e) => setNplGross(e.target.value)} style={inputStyle} />
              </div>
            </div>
          </div>

          {/* Section 5: Referensi & Lampiran */}
          <div style={cardSectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📁 Referensi & Lampiran Dokumen
              </span>
              <button
                type="button"
                onClick={handleAddRef}
                style={{
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38bdf8',
                  borderRadius: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                + Tambah Link
              </button>
            </div>

            {referensi.map((ref, idx) => (
              <div
                key={idx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '130px 1fr 1fr 1fr auto',
                  gap: '0.6rem',
                  marginBottom: '0.6rem',
                  alignItems: 'center',
                }}
              >
                <select value={ref.tipe} onChange={(e) => handleRefChange(idx, 'tipe', e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="dokumen">📁 Lapkeu/PDF</option>
                  <option value="video">🎬 Video</option>
                  <option value="berita">📰 Berita/Riset</option>
                </select>
                <input type="text" placeholder="Label (LK BMRI Q2 2026)" value={ref.label} onChange={(e) => handleRefChange(idx, 'label', e.target.value)} style={inputStyle} />
                <input type="text" placeholder="URL Dokumen" value={ref.url} onChange={(e) => handleRefChange(idx, 'url', e.target.value)} style={inputStyle} />
                <input type="text" placeholder="Sumber (IDX / IR)" value={ref.sumber} onChange={(e) => handleRefChange(idx, 'sumber', e.target.value)} style={inputStyle} />
                <button
                  type="button"
                  onClick={() => handleRemoveRef(idx)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    borderRadius: '6px',
                    width: '32px',
                    height: '34px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Section 6: Catatan Riset & Bukti Gambar */}
          <div style={cardSectionStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📖 Catatan Riset & Bukti Screenshot
              </span>
              <button
                type="button"
                className="btn-sm btn-ghost"
                onClick={handleAddBlok}
              >
                + Tambah Paragraf
              </button>
            </div>

            {catatanRiset.map((blok, blokIndex) => (
              <div
                key={blokIndex}
                style={{
                  background: 'var(--surface)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--line)',
                  marginBottom: '1rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--ink)' }}>
                    Paragraf Analisa #{blokIndex + 1}
                  </span>
                  {catatanRiset.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveBlok(blokIndex)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--loss)',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Hapus Paragraf
                    </button>
                  )}
                </div>

                <textarea
                  rows={4}
                  placeholder="Tulis analisa fundamental, penjelasan neraca, laba rugi, atau rumus KaTeX ($...$ atau $$...$$)..."
                  value={blok.paragraf}
                  onChange={(e) => handleParagrafChange(blokIndex, e.target.value)}
                  style={{ ...inputStyle, marginBottom: '0.8rem', resize: 'vertical' }}
                />

                <div>
                  <label
                    className="btn-sm btn-ghost"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      cursor: 'pointer',
                      margin: 0,
                    }}
                  >
                    {uploadingIndex === blokIndex ? '⏳ Mengunggah...' : '📷 + Upload Screenshot Lapkeu'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingIndex !== null}
                      onChange={(e) => handleUploadImage(blokIndex, e)}
                    />
                  </label>
                </div>

                {blok.gambar_lapkeu && blok.gambar_lapkeu.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.8rem', marginTop: '0.8rem' }}>
                    {blok.gambar_lapkeu.map((img, imgIdx) => (
                      <div
                        key={imgIdx}
                        style={{
                          position: 'relative',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--line)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                        }}
                      >
                        <img
                          src={img.url}
                          alt="bukti lapkeu"
                          style={{ width: '100%', height: '110px', objectFit: 'contain', background: 'var(--surface)', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          placeholder="Caption gambar..."
                          value={img.caption || ''}
                          onChange={(e) => handleCaptionChange(blokIndex, imgIdx, e.target.value)}
                          style={{ ...inputStyle, fontSize: '0.75rem', marginTop: '0.4rem', padding: '0.4rem' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(blokIndex, imgIdx)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'var(--loss)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons Footer */}
          <div
            style={{
              display: 'flex',
              gap: '0.8rem',
              justifyContent: 'flex-end',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '0.6rem 1.4rem',
                fontSize: '0.88rem',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                background: '#0284c7',
                border: 'none',
                color: '#ffffff',
                borderRadius: '8px',
                padding: '0.6rem 1.6rem',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(2, 132, 199, 0.4)',
              }}
            >
              {submitting ? 'Menyimpan...' : editingRow?.id ? 'Simpan Perubahan' : 'Buat Jurnal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { adminMutate } from '../lib/adminApi'

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

  // Metrik Valuasi
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

  // Referensi (Tautan Video / PDF / Berita)
  const [referensi, setReferensi] = useState(
    editingRow?.referensi || [{ tipe: 'video', label: '', url: '', sumber: '' }]
  )

  // Blok Catatan Riset + Screenshot Lapkeu
  const [catatanRiset, setCatatanRiset] = useState(
    editingRow?.catatan_riset || [{ paragraf: '', gambar_lapkeu: [] }]
  )

  // -------------------------------------------------------------
  // Handler untuk Blok Narasi Riset Dinamis
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // Upload Gambar Langsung ke Supabase Storage
  // -------------------------------------------------------------
  const handleUploadImage = async (blokIndex, e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingIndex(blokIndex)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${(kodeSaham || 'lapkeu').toUpperCase()}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('journal-images')
        .upload(fileName, file) // Langsung pakai nama file

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

  // -------------------------------------------------------------
  // Handler untuk Link Referensi
  // -------------------------------------------------------------
  const handleAddRef = () => {
    setReferensi([...referensi, { tipe: 'video', label: '', url: '', sumber: '' }])
  }

  const handleRefChange = (idx, field, value) => {
    const next = [...referensi]
    next[idx][field] = value
    setReferensi(next)
  }

  const handleRemoveRef = (idx) => {
    setReferensi(referensi.filter((_, i) => i !== idx))
  }

  // -------------------------------------------------------------
  // Simpan ke Supabase via adminMutate
  // -------------------------------------------------------------
  
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

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '1.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 1.25rem 0', color: '#0f172a' }}>
          {editingRow ? 'Edit Catatan Jurnal' : '+ Tambah Jurnal Fundamental'}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* Section 1: Informasi Dasar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.8rem', marginBottom: '1.2rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Kode Saham</label>
              <input
                type="text"
                required
                placeholder="ACES"
                value={kodeSaham}
                onChange={(e) => setKodeSaham(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Nama Perusahaan</label>
              <input
                type="text"
                required
                placeholder="PT Aspirasi Hidup Indonesia Tbk"
                value={namaPerusahaan}
                onChange={(e) => setNamaPerusahaan(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
            <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Kuartal</label>
            <select
              value={kuartal.split(' ')[0]} // Ambil prefix Q1/Q2/Q3/Q4 jika sebelumnya ada tahun
              onChange={(e) => setKuartal(e.target.value)}
              style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            >
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4 (Tahunan)</option>
            </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Tanggal Rilis</label>
              <input
                type="date"
                value={tanggalUpdate}
                onChange={(e) => setTanggalUpdate(e.target.value)}
                style={{ width: '100%', padding: '0.45rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          {/* Section 2: Metrik Finansial */}
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.2rem', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b', display: 'block', marginBottom: '0.75rem' }}>
              📊 Rasio Keuangan & Metrik Valuasi (Opsional)
            </span>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem' }}>
              {/* Pertumbuhan (Growth) */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Revenue YoY</label>
                <input
                  type="text"
                  placeholder="+12.5%"
                  value={revenueYoy}
                  onChange={(e) => setRevenueYoy(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Net Profit YoY</label>
                <input
                  type="text"
                  placeholder="+24.0%"
                  value={netProfitYoy}
                  onChange={(e) => setNetProfitYoy(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              {/* Profitabilitas & Kesehatan Neraca */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>NPM (Net Margin)</label>
                <input
                  type="text"
                  placeholder="14.2%"
                  value={npm}
                  onChange={(e) => setNpm(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>ROE</label>
                <input
                  type="text"
                  placeholder="18.5%"
                  value={roe}
                  onChange={(e) => setRoe(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>DER (Utang/Modal)</label>
                <input
                  type="text"
                  placeholder="0.45x"
                  value={der}
                  onChange={(e) => setDer(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              {/* Valuasi & Return Saham */}
              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>PER / PBV</label>
                <input
                  type="text"
                  placeholder="PER 8.5x | PBV 1.2x"
                  value={per}
                  onChange={(e) => setPer(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Target Harga</label>
                <input
                  type="text"
                  placeholder="Rp 1.050"
                  value={targetHarga}
                  onChange={(e) => setTargetHarga(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Fair Value</label>
                <input
                  type="text"
                  placeholder="Rp 1.200"
                  value={fairValue}
                  onChange={(e) => setFairValue(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Margin of Safety</label>
                <input
                  type="text"
                  placeholder="25%"
                  value={mos}
                  onChange={(e) => setMos(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#64748b' }}>Div. Yield Est.</label>
                <input
                  type="text"
                  placeholder="6.2%"
                  value={dividenYield}
                  onChange={(e) => setDividenYield(e.target.value)}
                  style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Referensi Dokumen / Link Video */}
          <div style={{ marginBottom: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Referensi & Lampiran Dokumen</span>
              <button type="button" className="btn-link" style={{ fontSize: '0.75rem' }} onClick={handleAddRef}>+ Tambah Link</button>
            </div>
            {referensi.map((r, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <select
                  value={r.tipe}
                  onChange={(e) => handleRefChange(idx, 'tipe', e.target.value)}
                  style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                >
                  {/* <option value="video">🎬 Video</option> */}
                  <option value="dokumen">📁 PDF / Drive</option>
                  <option value="berita">📰 Berita</option>
                </select>
                <input
                  type="text"
                  placeholder="Label (contoh: Jurnal PDF)"
                  value={r.label}
                  onChange={(e) => handleRefChange(idx, 'label', e.target.value)}
                  style={{ flex: 1, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
                <input
                  type="url"
                  placeholder="URL link..."
                  value={r.url}
                  onChange={(e) => handleRefChange(idx, 'url', e.target.value)}
                  style={{ flex: 1.5, padding: '0.4rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                />
                <button type="button" className="btn-danger" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleRemoveRef(idx)}>✕</button>
              </div>
            ))}
          </div>

          {/* Section 4: Catatan Narasi & Screenshot Lapkeu (Dinamis) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>Catatan Riset & Bukti Lapkeu</span>
              <button type="button" className="btn-link" style={{ fontSize: '0.75rem' }} onClick={handleAddBlok}>+ Tambah Paragraf/Blok</button>
            </div>

            {catatanRiset.map((blok, blokIdx) => (
              <div key={blokIdx} style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Bagian #{blokIdx + 1}</span>
                  {catatanRiset.length > 1 && (
                    <button type="button" className="btn-danger" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }} onClick={() => handleRemoveBlok(blokIdx)}>Hapus Bagian</button>
                  )}
                </div>
                <textarea
                  rows="3"
                  placeholder="Tulis analisa mendalam atau ringkasan baris laporan keuangan di sini..."
                  value={blok.paragraf}
                  onChange={(e) => handleParagrafChange(blokIdx, e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem' }}
                />

                {/* Daftar Screenshot yang Diupload */}
                {blok.gambar_lapkeu?.map((img, imgIdx) => (
                  <div key={imgIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', background: '#fff', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <img src={img.url} alt="lapkeu" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    <input
                      type="text"
                      placeholder="Caption gambar (contoh: CaLK No 13 Aset Tetap)"
                      value={img.caption}
                      onChange={(e) => handleCaptionChange(blokIdx, imgIdx, e.target.value)}
                      style={{ flex: 1, padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                    <button type="button" className="btn-danger" style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} onClick={() => handleRemoveImage(blokIdx, imgIdx)}>✕</button>
                  </div>
                ))}

                {/* Input File Upload Gambar */}
                <div>
                  <label style={{ display: 'inline-block', cursor: 'pointer', fontSize: '0.75rem', color: '#2563eb', fontWeight: 500 }}>
                    {uploadingIndex === blokIdx ? '⏳ Mengunggah gambar...' : '📷 + Upload Screenshot Lapkeu'}
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploadingIndex === blokIdx}
                      style={{ display: 'none' }}
                      onChange={(e) => handleUploadImage(blokIdx, e)}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>

          {/* Tombol Aksi */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
            <button type="button" className="btn-sm btn-ghost" onClick={onCancel} disabled={submitting}>Batal</button>
            <button type="submit" className="btn-sm btn-primary" disabled={submitting}>
              {submitting ? 'Menyimpan...' : 'Simpan Catatan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
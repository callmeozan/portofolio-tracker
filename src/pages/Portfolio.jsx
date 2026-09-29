import { useEffect, useState } from 'react'
import {
  formatRp, formatPct, formatDate,
  holdingMetrics, portfolioTotals, allocationPct,
  closedMetrics, dividendMetrics, dividendTotalsByKode,
} from '../lib/calc'
import { checkAdminSession, adminLogin, adminLogout, adminMutate } from '../lib/adminApi'
import { checkMemberSession, memberLogin, memberLogout, fetchPortfolioData, addBuyHistory, updateBuyHistory,deleteBuyHistory } from '../lib/memberApi'
import AdminRowForm from '../components/AdminRowForm'
import MemberPasswordForm from '../components/MemberPasswordForm'
import TickerBadge from '../components/TickerBadge'
import Journal from './Journal'

// const FOUNDED_DATE = '2024-10-08'

function TableSkeleton({ rows = 3, cols = 8 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className={c > 0 ? 'right' : ''}>
              <span className="skeleton skeleton-text" style={{ width: c === 0 ? '60px' : '45px' }}></span>
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  )
}

export default function Portfolio() {
  // ---------- member gate ----------
  const [isMember, setIsMember] = useState(false)
  const [checkingMember, setCheckingMember] = useState(true)
  const [memberPassword, setMemberPassword] = useState('')
  const [memberLoginError, setMemberLoginError] = useState(null)
  const [memberLoggingIn, setMemberLoggingIn] = useState(false)
  const [memberShake, setMemberShake] = useState(false)

  // ---------- data (cuma keisi setelah lolos gate) ----------
  const [holdings, setHoldings] = useState([])
  const [closed, setClosed] = useState([])
  const [dividends, setDividends] = useState([])
  const [settings, setSettings] = useState({ id: 1, sisa_cash: 0, founded_date: '2024-10-08' })
  const [picked, setPicked] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pp_reacted') || '[]')) } catch { return new Set() }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedYears, setExpandedYears] = useState(null)
  // Tambahkan tepat di bawah fungsi toggleYear milikmu:
  const [expandedDivYears, setExpandedDivYears] = useState(new Set([new Date().getFullYear()]))

  const toggleDivYear = (year) => {
    setExpandedDivYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  // ---------- admin ----------
  const [isAdmin, setIsAdmin] = useState(false)
  const [showLock, setShowLock] = useState(false)
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState(null)
  const [loggingIn, setLoggingIn] = useState(false)
  const [showMemberPasswordForm, setShowMemberPasswordForm] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')

  // State untuk menyimpan data emiten yang sedang dipilih untuk lihat riwayat
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [buyHistory, setBuyHistory] = useState([])
  const [statusMessage, setStatusMessage] = useState(null)
  const [deleteTargetId, setDeleteTargetId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // { table, row } -- row null berarti form "tambah baru"
  const [formTarget, setFormTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [toast, setToast] = useState(null) // { type: 'success' | 'error', message: '...' }
  const showNotification = (message, type = 'success') => {
    console.log('1. showNotification dipanggil:', message)
    setToast({ message, type })
    setTimeout(() => {
      setToast(null)
    }, 3000) // Toast otomatis hilang dalam 3 detik
  }

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light'
  })
 
  // 1. State untuk menampung input form pembelian
  const [formData, setFormData] = useState({
    tanggal_beli: '',
    jumlah_lot: '',
    harga_beli: '',
    modal_dca: '1000000',
    catatan: ''
  })

  // Pemicu saat tombol pensil diklik
  const handleStartEdit = (tx) => {
    setEditingId(tx.id)
    setFormData({
      tanggal_beli: tx.tanggal_beli || '',
      jumlah_lot: tx.jumlah_lot || '',
      harga_beli: tx.harga_beli || '',
      total_beli: tx.total_investasi || '',
      modal_dca: tx.modal_dca || '1000000',
      catatan: tx.catatan || ''
    })
  }

  // Batal Edit
  const handleCancelEdit = () => {
    setEditingId(null)
    setFormData({
      tanggal_beli: '',
      jumlah_lot: '',
      harga_beli: '',
      total_beli: '',
      modal_dca: '1000000',
      catatan: ''
    })
  }

  // 2. Fungsi handleSubmitBuy yang hilang
  const handleSubmitBuy = async (e) => {
  e.preventDefault()
  try {
    const kode = selectedHistory.kode || selectedHistory.kode_saham
    const lot = Number(formData.jumlah_lot)
    const harga = Number(formData.harga_beli)
    const totalRiil = Number(formData.total_beli) || (lot * 100 * harga)
    const modal = Number(formData.modal_dca) || totalRiil

    const payload = {
      kode: kode.toUpperCase(),
      tanggal_beli: formData.tanggal_beli,
      jumlah_lot: lot,
      harga_beli: harga,
      total_investasi: totalRiil,
      modal_dca: modal,
      catatan: formData.catatan
    }

    if (editingId) {
      await updateBuyHistory({ id: editingId, ...payload })
      setStatusMessage({ type: 'success', text: 'Data DCA berhasil diperbarui!' })
    } else {
      await addBuyHistory(payload)
      setStatusMessage({ type: 'success', text: 'Riwayat DCA berhasil disimpan!' })
    }

    handleCancelEdit()
    if (typeof loadAll === 'function') loadAll()
    setTimeout(() => setStatusMessage(null), 3000)
  } catch (err) {
    setStatusMessage({ type: 'error', text: 'Gagal memproses: ' + err.message })
  }
  }

  const handleLotOrHargaChange = (field, value) => {
  const updatedForm = { ...formData, [field]: value }
  const lot = Number(field === 'jumlah_lot' ? value : updatedForm.jumlah_lot)
  const harga = Number(field === 'harga_beli' ? value : updatedForm.harga_beli)
  
  // Hitung perkiraan total tanpa fee sebagai nilai awal
  if (lot > 0 && harga > 0) {
    updatedForm.total_beli = lot * 100 * harga
  }

  setFormData(updatedForm)
  }

  // Pemicu saat tombol tempat sampah diklik
  const triggerDeleteBuy = (id) => {
    setDeleteTargetId(id)
  }

  // Eksekusi hapus yang sebenarnya setelah user klik "Ya, Hapus"
  const confirmDeleteBuy = async () => {
    if (!deleteTargetId) return

    try {
      await deleteBuyHistory(deleteTargetId)
      setStatusMessage({ type: 'success', text: 'Transaksi berhasil dihapus!' })
      setDeleteTargetId(null) // Tutup modal konfirmasi
      if (typeof loadAll === 'function') loadAll()
      setTimeout(() => setStatusMessage(null), 3000)
    } catch (err) {
      setStatusMessage({ type: 'error', text: 'Gagal menghapus: ' + err.message })
      setDeleteTargetId(null)
    }
  }
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  useEffect(() => {
    checkMemberSession().then((member) => {
      setIsMember(member)
      setCheckingMember(false)
      if (member) {
        loadAll()
        checkAdminSession().then(setIsAdmin)
      }
    })
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchPortfolioData()
      if (!data) {
        setIsMember(false)
        return
      }
      setHoldings(data.holdings)
      setClosed(data.closed_positions)
      setDividends(data.dividends)
      setSettings(data.portfolio_settings)
      setBuyHistory(data.buy_history ?? [])
      const years = data.closed_positions.length
        ? [...new Set(data.closed_positions.map((row) => new Date(row.tanggal_jual).getFullYear()))]
        : []
      if (years.length) setExpandedYears((prev) => prev ?? new Set([Math.max(...years)]))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleMemberLogin(e) {
    e.preventDefault()
    setMemberLoggingIn(true)
    setMemberLoginError(null)
    try {
      await memberLogin(memberPassword)
      setIsMember(true)
      setMemberPassword('')
      loadAll()
      checkAdminSession().then(setIsAdmin)
    } catch (err) {
      setMemberLoginError(err.message)
      setMemberShake(true)
      setTimeout(() => setMemberShake(false), 400)
    } finally {
      setMemberLoggingIn(false)
    }
  }

  async function handleMemberLogout() {
    await memberLogout()
    if (isAdmin) { await adminLogout(); setIsAdmin(false) }
    setIsMember(false)
    setHoldings([]); setClosed([]); setDividends([])
  }

  function toggleYear(year) {
    setExpandedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) next.delete(year)
      else next.add(year)
      return next
    })
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoggingIn(true)
    setLoginError(null)
    try {
      await adminLogin(password)
      setIsAdmin(true)
      setShowLock(false)
      setPassword('')
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await adminLogout()
    setIsAdmin(false)
  }

  async function executeDelete() {
    if (!deleteTarget) return
    try {
      await adminMutate(deleteTarget.table, 'delete', { id: deleteTarget.id })
      setDeleteTarget(null)

      // Toast Notifikasi Hapus Berhasil
      showNotification('🗑️ Data berhasil dihapus')

      loadAll() // Memuat ulang data
    } catch (err) {
      showNotification(`❌ Gagal menghapus: ${err.message}`, 'error')
    }
  }

  function closeForm() {
    console.log('2. closeForm dipanggil!')
    const isEdit = Boolean(formTarget?.row)
    showNotification(
      isEdit ? '✓ Data berhasil diperbarui' : '✓ Data berhasil ditambahkan'
    )

    setFormTarget(null)
    loadAll()
  }

  // Komponen Modal Konfirmasi Hapus
  function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
    if (!isOpen) return null

    return (
      <div className="admin-modal-overlay" onClick={onCancel}>
        <div 
          className="admin-modal-card modal-sm" 
          onClick={(e) => e.stopPropagation()}
          style={{ textAlign: 'center' }}
        >
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--ink)', fontSize: '1.1rem' }}>
            {title || 'Konfirmasi Hapus'}
          </h4>
          <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
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
              className="btn-sm"
              style={{ 
                minWidth: '80px', 
                padding: '0.45rem 1rem',
                background: 'var(--loss)', 
                color: '#fff', 
                border: 'none' 
              }}
              onClick={onConfirm}
            >
              Ya, Hapus
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // GATE: belum lolos password member -> jangan render data apapun
  // ============================================================
  if (checkingMember) {
    return <div className="page"><p className="empty">Memuat...</p></div>
  }

  // if (!isMember) {
  //   return (
  //     <div className="page">
  //       <div className="gate-overlay">
  //         <div className="gate-card">
  //           <div className="icon">🔒</div>
  //           <h2>Khusus Faozan</h2>
  //           <p>
  //             Portofolio Palsu ini eksklusif untuk Faozan dan hanya orang yang diberi akses khusus untuk melihat Portfolio Palsu ini.
  //           </p>
  //           <form onSubmit={handleMemberLogin}>
  //             <input
  //               type="text"
  //               autoFocus
  //               placeholder="Password bulan ini"
  //               value={memberPassword}
  //               onChange={(e) => { setMemberPassword(e.target.value); setMemberLoginError(null) }}
  //               className={`${memberLoginError ? 'input-error' : ''} ${memberShake ? 'input-shake' : ''}`}
  //             />
  //             <button className="gate-btn" type="submit" disabled={memberLoggingIn}>
  //               {memberLoggingIn ? 'Cek...' : 'Buka Halaman'}
  //             </button>
  //           </form>
  //           <div className="gate-hint">
  //             Mau tahu passwordnya? Tanya Faozan langsung. Jangan share ke orang lain.
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  // ============================================================
  // KONTEN (cuma sampe sini kalau udah lolos gate)
  // ============================================================
  const totals = portfolioTotals(holdings, dividends)
  const divByKode = dividendTotalsByKode(dividends)
  const latestPriceUpdate = holdings.reduce((max, h) => {
    if (!h.harga_updated_at) return max
    const t = new Date(h.harga_updated_at).getTime()
    return t > max ? t : max
  }, 0)

  return (
    <div className="page" style={{ position: 'relative' }}>
      <div className={!isMember ? 'content-blurred' : ''}>

      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Hapus Data Ini?"
        message={`Baris data dari tabel ${deleteTarget?.table} ini akan dihapus permanen.`}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <header className="masthead">
        <div className="brand">
          {/* <div className="logo"><img src="/favicon-180.png" alt="SDN" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /></div> */}
          <div className="logo">
            <img 
              src={theme === 'dark' ? '/logo-dark.png' : '/favicon-180.png'} 
              alt="SDN" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </div>
          <div className="brand-text">
            <div className="eyebrow">Saham Dari Nol</div>
            <h1>Portofolio Palsu</h1>
          </div>
        </div>

        {/* --- Tombol Navigasi Tab --- */}
        <div className="nav-tabs" style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            type="button"
            className={`btn-sm ${activeTab === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('summary')}
          >
            📊 Ringkasan Saham
          </button>
          <button
            type="button"
            className={`btn-sm ${activeTab === 'journal' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('journal')}
          >
            📑 Jurnal Fundamental
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tombol Dark Mode gabung di sini */}
          <button 
            type="button" 
            className="btn-ghost btn-sm" 
            onClick={toggleTheme}
            title="Ganti Mode Gelap/Terang"
            style={{ fontSize: '0.95rem', padding: '0.35rem 0.55rem' }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {isAdmin && (
            <button className="btn-link" onClick={() => setShowMemberPasswordForm((s) => !s)}>Ganti Password Member</button>
          )}
          {isAdmin ? (
            <button className="unlock-btn is-admin" onClick={handleLogout}>✓ Admin — Logout</button>
          ) : (
            <button className="unlock-btn" onClick={() => setShowLock((s) => !s)}>🔒 Masuk sebagai admin</button>
          )}
          <button className="btn-link" onClick={handleMemberLogout}>Keluar</button>
        </div>
      </header>

      {showLock && !isAdmin && (
        <form className="lock-popover" onSubmit={handleLogin}>
          <input
            type="password"
            autoFocus
            placeholder="Password admin"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {loginError && <p className="admin-error">{loginError}</p>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-sm btn-primary" type="submit" disabled={loggingIn}>
              {loggingIn ? 'Cek...' : 'Masuk'}
            </button>
            <button className="btn-sm btn-ghost" type="button" onClick={() => setShowLock(false)}>Batal</button>
          </div>
        </form>
      )}

      {showMemberPasswordForm && isAdmin && (
        <MemberPasswordForm
          onDone={() => setShowMemberPasswordForm(false)}
          onCancel={() => setShowMemberPasswordForm(false)}
        />
      )}

      <p className="meta-line">
        <span className="item"><span className="dot" />
          {latestPriceUpdate ? `Harga terakhir diperbarui ${new Date(latestPriceUpdate).toLocaleString('id-ID')}` : 'Menunggu update harga...'}
        </span>
        {/* <span className="item">Portofolio ini berjalan sejak <strong>{formatDate(FOUNDED_DATE)}</strong></span> */}
        <span className="item">Portofolio ini berjalan sejak <strong>{formatDate(settings?.founded_date || '2024-10-08')}</strong></span>
      </p>

      {error && <p className="empty">Gagal memuat data: {error}</p>}

      {!error && (
        <>
        {activeTab === 'summary' ? (
          <>

          {formTarget?.table === 'portfolio_settings' && (
            <AdminRowForm table="portfolio_settings" editingRow={formTarget.row} onDone={closeForm} onCancel={() => setFormTarget(null)} />
          )}

          {/* ============ 0. SUMMARY ============ */}
          <div className="summary-row">
            <div className="summary-cell">
              <span className="label">Total Invested</span>
              <span className="value num">
                {loading ? <span className="skeleton skeleton-text" style={{ width: '90px' }} /> : formatRp(totals.totalInvested)}
              </span>
            </div>

            <div className="summary-cell">
              <span className="label">Nilai Pasar</span>
              <span className="value num">
                {loading ? <span className="skeleton skeleton-text" style={{ width: '90px' }} /> : formatRp(totals.totalMarket)}
              </span>
            </div>

            <div className="summary-cell">
              <span className="label">Floating P/L</span>
              <span className="value num">
                {loading ? (
                  <span className="skeleton skeleton-text" style={{ width: '110px' }} />
                ) : (
                  <>
                    <span className={totals.floating >= 0 ? 'gain' : 'loss'}>{formatRp(totals.floating)}</span>{' '}
                    <span className={`pct-inline ${totals.floating >= 0 ? 'gain' : 'loss'}`}>({formatPct(totals.floatingPct)})</span>
                  </>
                )}
              </span>
            </div>

            <div className="summary-cell">
              <span className="label">Akumulasi Dividen</span>
              <span className="value num gain">
                {loading ? <span className="skeleton skeleton-text" style={{ width: '80px' }} /> : formatRp(totals.totalDividen)}
              </span>
            </div>

            <div className="summary-cell">
              <span className="label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Sisa Cash
                {isAdmin && !loading && (
                  <button className="btn-link" style={{ fontSize: '0.68rem' }} onClick={() => setFormTarget({ table: 'portfolio_settings', row: settings })}>Edit</button>
                )}
              </span>
              <span className="value num">
                {loading ? <span className="skeleton skeleton-text" style={{ width: '80px' }} /> : formatRp(settings.sisa_cash)}
              </span>
            </div>

            <div className="summary-cell">
              <span className="label">Total Portofolio</span>
              <span className="value num">
                {loading ? <span className="skeleton skeleton-text" style={{ width: '90px' }} /> : formatRp(totals.totalMarket + Number(settings.sisa_cash ?? 0))}
              </span>
            </div>
          </div>

          {/* ============ 01. POSISI AKTIF ============ */}
          <section className="ledger">
            <div className="section-head">
              <div>
                <h2><span className="idx">01</span> Posisi Aktif</h2>
                <p className="note">Harga diperbarui otomatis tiap 15–20 menit selama jam bursa. Akumulasi dividen dihitung dari total baris di tabel Penerimaan Dividen.</p>
              </div>
              {isAdmin && (
                <button className="btn-sm btn-primary" onClick={() => setFormTarget({ table: 'holdings', row: null })}>+ Tambah</button>
              )}
            </div>

            {formTarget?.table === 'holdings' && (
              <AdminRowForm table="holdings" editingRow={formTarget.row} onDone={closeForm} onCancel={() => setFormTarget(null)} />
            )}

            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Kode</th>
                    <th className="right">Lot</th>
                    <th className="right">Avg Beli</th>
                    <th className="right">Harga Beli</th>
                    <th className="right">Harga Kini</th>
                    <th className="right">Nilai Pasar</th>
                    <th className="right">Floating (Rp)</th>
                    <th className="right">Floating (%)</th>
                    <th className="right">Alokasi</th>
                    <th className="right">Akum. Dividen</th>
                    {isAdmin && <th></th>}
                  </tr>
                </thead>

                {/* 1. Kondisi saat masih loading data */}
                {loading ? (
                  <TableSkeleton rows={3} cols={isAdmin ? 11 : 10} />
                ) : holdings.length === 0 ? (
                  /* 2. Kondisi jika data sudah selesai diload tapi kosong */
                  <tbody>
                    <tr>
                      <td colSpan={isAdmin ? 11 : 10} className="empty">
                        Belum ada posisi aktif.
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  /* 3. Kondisi jika data ada */
                  <tbody>
                    {holdings.map((h) => {
                      const m = holdingMetrics(h, divByKode[h.kode_saham] ?? 0)
                      const alloc = allocationPct(h, totals.totalMarket)
                      return (
                        <tr key={h.id}>
                          <td className="kode kode-row" data-label="">
                            <span className="ticker-cell"
                            style={{ cursor: 'pointer' }} 
                            onClick={() => setSelectedHistory(h)}
                            >
                              <TickerBadge kode={h.kode_saham} />
                              {h.kode_saham}
                              {h.syariah && <span className="tag">syariah</span>}
                            </span>
                          </td>
                          <td data-label="Lot" className="right num">{h.jumlah_lot}</td>
                          <td data-label="Avg Beli" className="right num">{formatRp(h.harga_beli_rata)}</td>
                          <td data-label="Harga Beli" className="right num">{formatRp(h.total_harga_beli)}</td>
                          <td data-label="Harga Kini" className="right num">{formatRp(h.harga_saat_ini)}</td>
                          <td data-label="Nilai Pasar" className="right num">{formatRp(m.hargaPasar)}</td>
                          <td data-label="Floating (Rp)" className={`right num ${m.floating >= 0 ? 'gain' : 'loss'}`}>{formatRp(m.floating)}</td>
                          <td data-label="Floating (%)" className={`right num ${m.floating >= 0 ? 'gain' : 'loss'}`}>{formatPct(m.floatingPct)}</td>
                          <td data-label="Alokasi" className="right num">{alloc ? alloc.toFixed(1) + '%' : '—'}</td>
                          <td data-label="Akum. Dividen" className="right num gain">{formatRp(m.totalDividenKode)}</td>
                          {isAdmin && (
                            <td className="row-actions row-actions-cell" data-label="">
                              <button className="btn-link" onClick={() => setFormTarget({ table: 'holdings', row: h })}>Edit</button>
                              <button className="btn-danger" onClick={() => setDeleteTarget({ table: 'holdings', id: h.id })}>Hapus</button>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                )}
              </table>
            </div>
          </section>

          {/* ============ 02. SAHAM TERJUAL ============ */}
          <section className="ledger">
            <div className="section-head">
              <div>
                <h2><span className="idx">02</span> Saham yang Telah Dijual</h2>
                <p className="note">Dikelompokkan per tahun penjualan.</p>
              </div>
              {isAdmin && (
                <button className="btn-sm btn-primary" onClick={() => setFormTarget({ table: 'closed_positions', row: null })}>+ Tambah</button>
              )}
            </div>

            {formTarget?.table === 'closed_positions' && (
              <AdminRowForm table="closed_positions" editingRow={formTarget.row} onDone={closeForm} onCancel={() => setFormTarget(null)} />
            )}

            {loading ? (
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Kode</th><th>Beli</th><th>Jual</th>
                      <th className="right">Lot</th><th className="right">Nilai Beli</th>
                      <th className="right">Nilai Jual</th><th className="right">∆</th><th>Ket.</th>
                      {isAdmin && <th></th>}
                    </tr>
                  </thead>
                  <TableSkeleton rows={3} cols={isAdmin ? 9 : 8} />
                </table>
              </div>
            ) : closed.length === 0 ? (
              <div className="table-card"><p className="empty">Belum ada riwayat penjualan.</p></div>
            ) : (
              Object.entries(
                closed.reduce((acc, c) => {
                  const year = new Date(c.tanggal_jual).getFullYear()
                  if (!acc[year]) acc[year] = []
                  acc[year].push(c)
                  return acc
                }, {})
              )
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([year, rows]) => {
                  const isOpen = expandedYears?.has(Number(year))

                  // Hitung total realisasi gain/loss pada tahun ini
                  const yearGainLoss = rows.reduce((acc, c) => {
                    const beli = Number(c.nilai_beli || 0)
                    const jual = Number(c.nilai_jual || 0)
                    return acc + (jual - beli)
                  }, 0)

                  return (
                    <div key={year} className="year-group">
                      <button className="year-toggle" onClick={() => toggleYear(Number(year))}>
                        {/* Sisi Kiri: Tanda Panah & Tahun */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{isOpen ? '▾' : '▸'}</span>
                          <span>{year}</span>
                        </div>

                        {/* Sisi Kanan: Jumlah Transaksi & Badge Akumulasi Nominal */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge-count">{rows.length} transaksi</span>
                          <span className={`badge-pill ${yearGainLoss >= 0 ? 'badge-gain' : 'badge-loss'}`}>
                            {yearGainLoss >= 0 ? `+${formatRp(yearGainLoss)}` : formatRp(yearGainLoss)}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="table-card">
                          <table>
                            <thead>
                              <tr>
                                <th>Kode</th><th>Beli</th><th>Jual</th>
                                <th className="right">Lot</th><th className="right">Nilai Beli</th>
                                <th className="right">Nilai Jual</th><th className="right">∆</th><th>Ket.</th>
                                {isAdmin && <th></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((c) => {
                                const m = closedMetrics(c)
                                return (
                                  <tr key={c.id}>
                                    <td className="kode kode-row" data-label=""><span className="ticker-cell"><TickerBadge kode={c.kode_saham} />{c.kode_saham}</span></td>
                                    <td data-label="Beli">{formatDate(c.tanggal_beli)}</td>
                                    <td data-label="Jual">{formatDate(c.tanggal_jual)}</td>
                                    <td data-label="Lot" className="right num">{c.jumlah_lot}</td>
                                    <td data-label="Nilai Beli" className="right num">{formatRp(c.nilai_beli)}</td>
                                    <td data-label="Nilai Jual" className="right num">{formatRp(c.nilai_jual)}</td>
                                    <td data-label="∆" className={`right num ${m.delta >= 0 ? 'gain' : 'loss'}`}>{formatPct(m.deltaPct)}</td>
                                    <td data-label="Ket.">{c.keterangan ? <span className="tag">{c.keterangan}</span> : ''}</td>
                                    {isAdmin && (
                                      <td className="row-actions row-actions-cell" data-label="">
                                        <button className="btn-link" onClick={() => setFormTarget({ table: 'closed_positions', row: c })}>Edit</button>
                                        <button className="btn-danger" onClick={() => setDeleteTarget({ table: 'closed_positions', id: c.id })}>Hapus</button>
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </section>

          {/* ============ 03. PENERIMAAN DIVIDEN ============ */}
          <section className="ledger">
            <div className="section-head">
              <div>
                <h2><span className="idx">03</span> Penerimaan Dividen</h2>
                <p className="note">
                  Total dividen diterima sejak portofolio ini dibuat:{' '}
                  <strong className="num gain">{formatRp(totals.totalDividen)}</strong>
                </p>
              </div>
              {isAdmin && (
                <button className="btn-sm btn-primary" onClick={() => setFormTarget({ table: 'dividends', row: null })}>+ Tambah</button>
              )}
            </div>

            {formTarget?.table === 'dividends' && (
              <AdminRowForm table="dividends" editingRow={formTarget.row} onDone={closeForm} onCancel={() => setFormTarget(null)} />
            )}

            {loading ? (
              <div className="table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Tanggal</th><th>Kode</th><th className="right">Lot</th>
                      <th className="right">Div/Saham</th><th className="right">Yield</th><th className="right">Total Dividen</th>
                      {isAdmin && <th></th>}
                    </tr>
                  </thead>
                  <TableSkeleton rows={3} cols={isAdmin ? 7 : 6} />
                </table>
              </div>
            ) : dividends.length === 0 ? (
              <div className="table-card"><p className="empty">Belum ada riwayat dividen.</p></div>
            ) : (
              Object.entries(
                dividends.reduce((acc, d) => {
                  const year = new Date(d.tanggal_terima).getFullYear()
                  if (!acc[year]) acc[year] = []
                  acc[year].push(d)
                  return acc
                }, {})
              )
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([year, rows]) => {
                  const isOpen = expandedDivYears?.has(Number(year))
                  const yearTotalDiv = rows.reduce((acc, d) => {
                    const m = dividendMetrics(d)
                    return acc + Number(m.totalDividen || 0)
                  }, 0)

                  return (
                    <div key={year} className="year-group">
                      <button className="year-toggle" onClick={() => toggleDivYear(Number(year))}>
                        {/* Sisi Kiri: Tanda Panah & Tahun */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{isOpen ? '▾' : '▸'}</span>
                          <span>{year}</span>
                        </div>

                        {/* Sisi Kanan: Jumlah Pembayaran & Badge Total Dividen */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className="badge-count">{rows.length} pembayaran</span>
                          <span className="badge-pill badge-gain">
                            {formatRp(yearTotalDiv)}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="table-card">
                          <table>
                            <thead>
                              <tr>
                                <th>Tanggal</th><th>Kode</th><th className="right">Lot</th>
                                <th className="right">Div/Saham</th><th className="right">Yield</th><th className="right">Total Dividen</th>
                                {isAdmin && <th></th>}
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((d) => {
                                const m = dividendMetrics(d)
                                return (
                                  <tr key={d.id}>
                                    <td data-label="Tanggal">{formatDate(d.tanggal_terima)}</td>
                                    <td className="kode kode-row" data-label=""><span className="ticker-cell"><TickerBadge kode={d.kode_saham} />{d.kode_saham}</span></td>
                                    <td data-label="Lot" className="right num">{d.jumlah_lot}</td>
                                    <td data-label="Div/Saham" className="right num">{formatRp(d.dividen_per_saham)}</td>
                                    <td data-label="Yield" className="right num gain">{formatPct(m.yieldPct)}</td>
                                    <td data-label="Total" className="right num gain">{formatRp(m.totalDividen)}</td>
                                    {isAdmin && (
                                      <td className="row-actions row-actions-cell" data-label="">
                                        <button className="btn-link" onClick={() => setFormTarget({ table: 'dividends', row: d })}>Edit</button>
                                        <button className="btn-danger" onClick={() => setDeleteTarget({ table: 'dividends', id: d.id })}>Hapus</button>
                                      </td>
                                    )}
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })
            )}
          </section>
        </>
        ) : (
          <Journal isAdmin={isAdmin} />
      )}
      </>
      )}

      <footer className="pp-footer">
        <span>Portofolio Palsu — dibentuk untuk tujuan edukasi. Bukan rekomendasi beli/jual.</span>
        <span>Data hanya bisa diubah oleh Faozan.</span>
      </footer>
    </div>

    {!isMember && (
        <div className="gate-overlay">
          <div className="gate-card">
            <div className="icon">🔒</div>
            <h2>Khusus Faozan</h2>
            <p>
              Portofolio Palsu ini eksklusif untuk Faozan dan hanya orang yang diberi akses khusus untuk melihat Portfolio Palsu ini.
            </p>
            <form onSubmit={handleMemberLogin}>
              <input
                type="text"
                autoFocus
                placeholder="Password bulan ini"
                value={memberPassword}
                onChange={(e) => { setMemberPassword(e.target.value); setMemberLoginError(null) }}
                className={`${memberLoginError ? 'input-error' : ''} ${memberShake ? 'input-shake' : ''}`}
              />
              <button className="gate-btn" type="submit" disabled={memberLoggingIn}>
                {memberLoggingIn ? 'Cek...' : 'Buka Halaman'}
              </button>
            </form>
            <div className="gate-hint">
              Mau tahu passwordnya? Tanya Faozan langsung. Jangan share ke orang lain.
            </div>
          </div>
        </div>
      )}

      {/* Modal Riwayat Pembelian & DCA Tracker */}
      {selectedHistory && (() => {
        const currentTicker = (selectedHistory.kode || selectedHistory.kode_saham)?.toUpperCase()
        
        const tickerHistory = buyHistory
          .filter((item) => item.kode?.toUpperCase() === currentTicker)
          .sort((a, b) => new Date(a.tanggal_beli) - new Date(b.tanggal_beli))

        const lastTx = tickerHistory[tickerHistory.length - 1]
        const prevTx = tickerHistory[tickerHistory.length - 2]
        
        // 1. Tren vs Pembelian Sebelumnya
        let prevDiffPct = null
        if (lastTx && prevTx && Number(prevTx.harga_beli) > 0) {
          prevDiffPct = ((Number(lastTx.harga_beli) - Number(prevTx.harga_beli)) / Number(prevTx.harga_beli)) * 100
        }

        // Kalkulasi Akumulasi & Avg Buy
        const totalLot = tickerHistory.reduce((sum, item) => sum + Number(item.jumlah_lot), 0)
        const totalInvestasi = tickerHistory.reduce((sum, item) => sum + Number(item.total_investasi), 0)
        const avgBuy = totalLot > 0 ? Math.round(totalInvestasi / (totalLot * 100)) : 0

        // 2. Tren vs Avg Buy Keseluruhan
        let avgDiffPct = null
        if (lastTx && avgBuy > 0) {
          avgDiffPct = ((Number(lastTx.harga_beli) - avgBuy) / avgBuy) * 100
        }

        return (
          <div 
            className="gate-overlay" 
            onClick={() => { setSelectedHistory(null); handleCancelEdit(); }}
            style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '12px'
            }}
          >
            <div 
              className="gate-card" 
              style={{ 
                maxWidth: '720px', 
                width: '100%', 
                maxHeight: '90vh',
                overflowY: 'auto',
                padding: '20px', 
                borderRadius: '16px',
                backgroundColor: '#ffffff',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' 
              }} 
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                    DCA Tracker: <span style={{ color: '#2563eb' }}>{currentTicker}</span>
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                    Riwayat akumulasi lot & efisiensi alokasi budget
                  </p>
                </div>
                <button 
                  onClick={() => { setSelectedHistory(null); handleCancelEdit(); }}
                  style={{ fontSize: '1rem', color: '#64748b', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
                >
                  ✕
                </button>
              </div>

              {/* Ringkasan Analisa DCA Terkini (Grid 2 Kolom di Mobile, 4 Kolom di Desktop) */}
              {lastTx && (
                <div 
                  style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                    gap: '8px', 
                    marginBottom: '14px', 
                    background: '#f8fafc', 
                    padding: '10px 12px', 
                    borderRadius: '10px', 
                    border: '1px solid #e2e8f0' 
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 500 }}>Beli Terakhir</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{formatRp(lastTx.harga_beli)}</strong>
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 500 }}>vs Beli Lalu</span>
                    {prevDiffPct !== null ? (
                      <strong style={{ fontSize: '0.85rem', color: prevDiffPct > 0 ? '#dc2626' : prevDiffPct < 0 ? '#16a34a' : '#6b7280' }}>
                        {prevDiffPct > 0 ? `▲ +${prevDiffPct.toFixed(1)}%` : prevDiffPct < 0 ? `▼ ${prevDiffPct.toFixed(1)}%` : '0.0%'}
                      </strong>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: 600, display: 'block' }}>vs Avg Buy</span>
                    {avgDiffPct !== null ? (
                      <strong style={{ fontSize: '0.85rem', color: avgDiffPct <= 0 ? '#16a34a' : '#ea580c' }}>
                        {avgDiffPct <= 0 ? `Diskon ${Math.abs(avgDiffPct).toFixed(1)}%` : `+${avgDiffPct.toFixed(1)}%`}
                      </strong>
                    ) : (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>-</span>
                    )}
                  </div>

                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', fontWeight: 500 }}>Avg Buy / Accum</span>
                    <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                      {formatRp(avgBuy)} <span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#64748b' }}>({totalLot} Lot)</span>
                    </strong>
                  </div>
                </div>
              )}

              {/* Tabel List Riwayat Pembelian (Horizontal Scrollable) */}
              <div style={{ width: '100%', overflowX: 'auto', marginBottom: isAdmin ? '16px' : '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', minWidth: '580px', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.03em' }}>
                      <th style={{ padding: '8px 10px' }}>Tanggal</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Budget</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Harga Beli</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Lot</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total Beli</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Kembalian</th>
                      <th style={{ padding: '8px 10px' }}>Catatan</th>
                      {isAdmin && <th style={{ padding: '8px 10px', textAlign: 'center' }}>Aksi</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {tickerHistory.map((tx, idx) => {
                      const modal = Number(tx.modal_dca || tx.total_investasi)
                      const total = Number(tx.total_investasi)
                      const sisa = modal - total

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: editingId === tx.id ? '#eff6ff' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', color: '#0f172a', whiteSpace: 'nowrap' }}>{tx.tanggal_beli}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#64748b', whiteSpace: 'nowrap' }}>{formatRp(modal)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatRp(tx.harga_beli)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>{tx.jumlah_lot}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#16a34a', fontWeight: 600, whiteSpace: 'nowrap' }}>{formatRp(total)}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: sisa > 0 ? '#2563eb' : '#94a3b8', whiteSpace: 'nowrap' }}>
                            {sisa > 0 ? formatRp(sisa) : 'Rp0'}
                          </td>
                          <td style={{ padding: '8px 10px', color: '#64748b', fontSize: '0.75rem', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {tx.catatan || '-'}
                          </td>
                          {isAdmin && (
                            <td style={{ padding: '8px 10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              <button
                                onClick={() => handleStartEdit(tx)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', marginRight: '6px' }}
                                title="Edit Transaksi"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => triggerDeleteBuy(tx.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                title="Hapus Transaksi"
                              >
                                🗑️
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {tickerHistory.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                          Belum ada riwayat DCA untuk emiten ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Form Tambah/Edit Transaksi (Khusus Admin) - Responsif 2/3 Kolom */}
              {isAdmin && (
                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: editingId ? '#2563eb' : '#0f172a' }}>
                      {editingId ? '✏️ Edit Transaksi DCA' : '+ Input DCA Bulan Ini'}
                    </h4>
                    {editingId && (
                      <button
                        onClick={handleCancelEdit}
                        style={{ background: 'none', border: 'none', fontSize: '0.75rem', color: '#ef4444', cursor: 'pointer' }}
                      >
                        Batal Edit
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleSubmitBuy} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Tanggal Beli</label>
                      <input
                        type="date"
                        required
                        value={formData.tanggal_beli}
                        onChange={(e) => setFormData({ ...formData, tanggal_beli: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Budget DCA (Rp)</label>
                      <input
                        type="number"
                        placeholder="1000000"
                        value={formData.modal_dca}
                        onChange={(e) => setFormData({ ...formData, modal_dca: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Harga Beli (lembar)</label>
                      <input
                        type="number"
                        required
                        placeholder="3830"
                        value={formData.harga_beli}
                        onChange={(e) => handleLotOrHargaChange('harga_beli', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Jumlah Lot</label>
                      <input
                        type="number"
                        required
                        placeholder="1"
                        value={formData.jumlah_lot}
                        onChange={(e) => handleLotOrHargaChange('jumlah_lot', e.target.value)}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Total Beli (inc. Fee)</label>
                      <input
                        type="number"
                        placeholder="Otomatis / Input Riil"
                        value={formData.total_beli}
                        onChange={(e) => setFormData({ ...formData, total_beli: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem', backgroundColor: '#f8fafc' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 500, color: '#475569', marginBottom: '2px' }}>Catatan</label>
                      <input
                        type="text"
                        placeholder="DCA Rutin Jan"
                        value={formData.catatan}
                        onChange={(e) => setFormData({ ...formData, catatan: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.78rem' }}
                      />
                    </div>
                    <div style={{ gridColumn: '1 / -1', textAlign: 'right', marginTop: '4px' }}>
                      <button 
                        type="submit" 
                        style={{ 
                          width: '100%',
                          padding: '8px 16px', 
                          backgroundColor: editingId ? '#2563eb' : '#0f172a', 
                          color: '#ffffff', 
                          borderRadius: '8px', 
                          border: 'none', 
                          fontWeight: 600, 
                          fontSize: '0.8rem', 
                          cursor: 'pointer' 
                        }}
                      >
                        {editingId ? '✓ Update DCA' : '+ Simpan DCA'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Modal Konfirmasi Hapus Kustom */}
      {deleteTargetId && (
        <div 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999, // Naikkan z-index agar selalu paling atas
            padding: '16px'
          }} 
          onClick={() => setDeleteTargetId(null)}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff',
              maxWidth: '400px', 
              width: '100%', 
              padding: '24px', 
              borderRadius: '12px', 
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 600, color: '#111827' }}>
              Hapus Transaksi?
            </h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '0.875rem', color: '#6b7280' }}>
              Tindakan ini tidak dapat dibatalkan. Transaksi ini akan dihapus permanen dari riwayat DCA.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#f3f4f6',
                  color: '#374151',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteBuy}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification - TradingView Style */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px', // Pindahkan sementara ke atas agar mudah terlihat
            right: '20px',
            backgroundColor: toast.type === 'error' ? '#ef4444' : '#0f172a',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            fontSize: '0.85rem',
            fontWeight: 600,
            zIndex: 999999, // Super tinggi agar mengangkasa di atas modal
            pointerEvents: 'none',
            border: '1px solid #334155'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
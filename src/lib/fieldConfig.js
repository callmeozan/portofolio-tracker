export const FIELD_CONFIG = {
  holdings: [
    { name: 'kode_saham', label: 'Kode', type: 'text' },
    { name: 'syariah', label: 'Syariah', type: 'checkbox' },
    { name: 'jumlah_lot', label: 'Lot', type: 'number' },
    { name: 'harga_beli_rata', label: 'Avg Beli', type: 'number' },
    { name: 'total_harga_beli', label: 'Total Beli', type: 'number' },
    { name: 'harga_saat_ini', label: 'Harga Kini (opsional, auto-update)', type: 'number' },
  ],
  closed_positions: [
    { name: 'tanggal_beli', label: 'Tgl Beli', type: 'date' },
    { name: 'tanggal_jual', label: 'Tgl Jual', type: 'date' },
    { name: 'kode_saham', label: 'Kode', type: 'text' },
    { name: 'harga_beli', label: 'Harga Beli', type: 'number' },
    { name: 'jumlah_lot', label: 'Lot', type: 'number' },
    { name: 'nilai_beli', label: 'Nilai Beli', type: 'number' },
    { name: 'harga_jual', label: 'Harga Jual', type: 'number' },
    { name: 'nilai_jual', label: 'Nilai Jual', type: 'number' },
    { name: 'keterangan', label: 'Keterangan', type: 'text' },
  ],
  dividends: [
    { name: 'tanggal_terima', label: 'Tgl Terima', type: 'date' },
    { name: 'kode_saham', label: 'Kode', type: 'text' },
    { name: 'harga_beli', label: 'Harga Beli', type: 'number' },
    { name: 'jumlah_lot', label: 'Lot', type: 'number' },
    { name: 'nilai_beli', label: 'Nilai Beli', type: 'number' },
    { name: 'dividen_per_saham', label: 'Div/Saham', type: 'number' },
  ],
  portfolio_settings: [
    { name: 'announcement', label: 'Pengumuman', type: 'textarea' },
    { name: 'sisa_cash', label: 'Sisa Cash', type: 'number' },
  ],
}

export function emptyForm(table) {
  const f = {}
  for (const field of FIELD_CONFIG[table]) f[field.name] = field.type === 'checkbox' ? true : ''
  return f
}

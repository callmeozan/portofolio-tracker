export const FIELD_CONFIG = {
  holdings: [
    { name: 'kode_saham', label: 'Kode', type: 'text' },
    { name: 'syariah', label: 'Syariah', type: 'checkbox' },
    { name: 'jumlah_lot', label: 'Lot', type: 'number' },
    { name: 'harga_beli_rata', label: 'Avg Beli (Rp)', type: 'number' },
    { name: 'harga_saat_ini', label: 'Harga Kini (opsional, auto-update)', type: 'number' },
  ],
  closed_positions: [
    { name: 'kode_saham', label: 'Kode Saham', type: 'text' },
    { name: 'tanggal_beli', label: 'Tanggal Beli', type: 'date' },
    { name: 'tanggal_jual', label: 'Tanggal Jual', type: 'date' },
    { name: 'jumlah_lot', label: 'Jumlah Lot', type: 'number' },
    { name: 'harga_beli_rata', label: 'Harga Beli per Lembar (Rp)', type: 'number' },
    { name: 'harga_jual_rata', label: 'Harga Jual per Lembar (Rp)', type: 'number' },
    { name: 'keterangan', label: 'Keterangan / Alasan Jual', type: 'text' },
  ],
  dividends: [
    { name: 'tanggal_terima', label: 'Tgl Terima', type: 'date' },
    { name: 'kode_saham', label: 'Kode', type: 'text' },
    { name: 'jumlah_lot', label: 'Lot', type: 'number' },
    { name: 'harga_beli', label: 'Harga Beli Rata-rata (Rp)', type: 'number' },
    { name: 'dividen_per_saham', label: 'Div/Saham (Rp)', type: 'number' },
  ],
  portfolio_settings: [
    { name: 'announcement', label: 'Pengumuman', type: 'textarea' },
    { name: 'sisa_cash', label: 'Sisa Cash', type: 'number' },
    { name: 'founded_date', label: 'Tanggal Mulai Portofolio', type: 'date' },
  ],
}

export function emptyForm(table) {
  const f = {}
  for (const field of FIELD_CONFIG[table]) f[field.name] = field.type === 'checkbox' ? true : ''
  return f
}

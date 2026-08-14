-- ============================================================
-- CONTOH DATA (BUKAN DATA ASLI) — buat ngetes/nunjukin struktur doang.
-- Ganti semua ini sama data lo sendiri kalau mau pakai buat real.
-- ============================================================

-- HOLDINGS (posisi aktif saat ini) — contoh 2 baris
insert into holdings (kode_saham, syariah, jumlah_lot, harga_beli_rata, total_harga_beli, harga_saat_ini, harga_updated_at) values
('AAAA', true, 100, 1000, 10000000, 1100, now()),
('BBBB', true, 50, 2000, 10000000, 1900, now());

-- CLOSED POSITIONS (saham yang telah dijual) — contoh 1 baris
insert into closed_positions (tanggal_beli, tanggal_jual, kode_saham, harga_beli, jumlah_lot, nilai_beli, harga_jual, nilai_jual, keterangan) values
('2025-01-01','2025-03-01','CCCC',500,20,1000000,600,1200000,'Contoh transaksi selesai');

-- DIVIDENDS (penerimaan dividen) — contoh 1 baris
insert into dividends (tanggal_terima, kode_saham, harga_beli, jumlah_lot, nilai_beli, dividen_per_saham) values
('2025-06-01','AAAA',1000,100,10000000,15);

-- PORTFOLIO SETTINGS
-- member_password ini CONTOH DOANG -- ganti sebelum dipakai beneran,
-- dan JANGAN PERNAH commit password asli ke repo publik manapun.
insert into portfolio_settings (id, sisa_cash, member_password) values (1, 500000, 'ganti-password-ini')
on conflict (id) do nothing;

-- REACTIONS (emoji publik di bawah pengumuman)
insert into reactions (emoji, count) values
  ('👍', 0), ('🔥', 0), ('❤️', 0), ('🎉', 0), ('💪', 0)
on conflict (emoji) do nothing;

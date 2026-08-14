-- Jalankan ini di Supabase SQL Editor.
-- INI YANG BIKIN DATA BENERAN KEKUNCI: hapus semua policy "public read"
-- yang lama, jadi anon key (dipegang browser) gak bisa baca apapun lagi
-- langsung dari database. Satu-satunya jalan baca data sekarang lewat
-- /api/data di server, yang dijaga sesi member (password bulanan).

drop policy if exists "public_read_holdings" on holdings;
drop policy if exists "public_read_closed" on closed_positions;
drop policy if exists "public_read_dividends" on dividends;
drop policy if exists "public_read_settings" on portfolio_settings;
drop policy if exists "public_read_reactions" on reactions;

-- Kolom buat nyimpen password member (diedit admin lewat halaman itu
-- sendiri, gak perlu masuk Vercel/env var)
alter table portfolio_settings add column if not exists member_password text;

-- WAJIB diisi manual sekali di sini biar gate-nya bisa dipakai dari awal.
-- GANTI 'password-awal-lo' ke password yang mau lo pakai bulan ini.
-- Nanti seterusnya bisa diganti lewat halaman admin, gak perlu ke sini lagi.
update portfolio_settings set member_password = 'password-awal-lo' where id = 1;

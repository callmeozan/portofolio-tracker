-- Jalankan ini di Supabase SQL Editor.
-- Login sekarang pakai password sederhana yang dicek di server
-- (/api/admin-login), BUKAN Supabase Auth magic link lagi. Semua
-- tulis-menulis data lewat /api/admin/mutate pakai service role key.
-- Policy "admin_write_*" yang berbasis auth.role()='authenticated'
-- gak relevan lagi dan boleh dihapus -- anon key sekarang murni read-only.

drop policy if exists "admin_write_holdings" on holdings;
drop policy if exists "admin_write_closed" on closed_positions;
drop policy if exists "admin_write_dividends" on dividends;

-- Opsional: kalau lo sempet bikin user di Supabase Auth buat magic link
-- kemarin, boleh dihapus juga dari Authentication > Users di dashboard
-- (gak wajib, gak akan kepakai lagi, tapi rapi aja).

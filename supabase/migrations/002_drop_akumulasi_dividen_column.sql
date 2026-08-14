-- Jalankan ini di Supabase SQL Editor.
-- "Akumulasi Dividen" sekarang dihitung otomatis dari tabel `dividends`
-- (bukan angka manual terpisah lagi), supaya gak bisa nyimpang dari
-- data itemized. Kolom lama ini udah gak dipakai aplikasi.

alter table holdings drop column if exists akumulasi_dividen;

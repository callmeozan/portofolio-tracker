-- ============================================================
-- pp.sahamdarinol.com — Database schema
-- Jalankan ini di Supabase Dashboard -> SQL Editor -> New query
-- ============================================================

-- 1) TABEL: holdings (posisi aktif / "Pencatatan Saham di Aplikasi Sekuritas")
create table if not exists holdings (
  id uuid primary key default gen_random_uuid(),
  kode_saham text not null,
  syariah boolean default true,
  jumlah_lot numeric not null,
  harga_beli_rata numeric not null,       -- harga beli rata-rata
  total_harga_beli numeric not null,      -- termasuk fee beli
  harga_saat_ini numeric,                 -- auto-updated by cron
  harga_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
-- Catatan: akumulasi dividen TIDAK disimpan di tabel ini lagi.
-- Dihitung otomatis di frontend dari total baris tabel `dividends`
-- yang kode_saham-nya cocok, supaya gak bisa nyimpang dari data itemized.

-- 2) TABEL: closed_positions ("Saham yang telah dijual")
create table if not exists closed_positions (
  id uuid primary key default gen_random_uuid(),
  tanggal_beli date not null,
  tanggal_jual date not null,
  kode_saham text not null,
  harga_beli numeric not null,
  jumlah_lot numeric not null,
  nilai_beli numeric not null,
  harga_jual numeric not null,
  nilai_jual numeric not null,
  keterangan text,                        -- "Saham IPO", "Switch ke ASSA", dll
  created_at timestamptz default now()
);

-- 3) TABEL: dividends ("Penerimaan dividen")
create table if not exists dividends (
  id uuid primary key default gen_random_uuid(),
  tanggal_terima date not null,
  kode_saham text not null,
  harga_beli numeric not null,
  jumlah_lot numeric not null,
  nilai_beli numeric not null,
  dividen_per_saham numeric not null,
  created_at timestamptz default now()
);

-- 4) TABEL: portfolio_settings (nilai tunggal kayak "Sisa Cash",
-- pengumuman, dan password member -- cuma 1 baris, id selalu 1)
create table if not exists portfolio_settings (
  id int primary key default 1,
  sisa_cash numeric default 0,
  announcement text,
  announcement_updated_at timestamptz,
  member_password text,                   -- password bulanan buat gate halaman
  updated_at timestamptz default now()
);

-- 5) TABEL: reactions (emoji publik di bawah pengumuman). Cuma boleh
-- ditambah lewat function increment_reaction() di bawah -- SIAPA AJA
-- (tanpa login) boleh manggil function itu, tapi cuma bisa nambah
-- angka, gak bisa nulis apa-apa lain. Ini beda jalur dari data lain
-- yang butuh password admin.
create table if not exists reactions (
  emoji text primary key,
  count int default 0
);

-- ============================================================
-- Row Level Security
-- Prinsip: TIDAK ADA read policy publik sama sekali di sini -- semua
-- baca data (dan tulis) HARUS lewat endpoint server (/api/data buat baca,
-- /api/admin/mutate buat tulis) yang pakai service role key, dan
-- /api/data itu sendiri dijaga sesi member (password bulanan). Anon key
-- yang dipegang browser gak bisa baca ATAU nulis apapun langsung ke
-- tabel-tabel ini -- beneran kekunci di level data, bukan cuma tampilan.
-- ============================================================

alter table holdings enable row level security;
alter table closed_positions enable row level security;
alter table dividends enable row level security;
alter table portfolio_settings enable row level security;
alter table reactions enable row level security;

-- SENGAJA gak ada "create policy ... for select" di sini. Tanpa policy,
-- RLS default-nya nolak semua akses buat anon/authenticated -- cuma
-- service_role (dipegang server doang) yang bisa tembus.

-- Seed 5 emoji positif (gak ada opsi negatif sama sekali by design)
insert into reactions (emoji, count) values
  ('👍', 0), ('🔥', 0), ('❤️', 0), ('🎉', 0), ('💪', 0)
on conflict (emoji) do nothing;

-- Function khusus buat nambah counter reaction. security definer artinya
-- function ini jalan dengan hak akses pemiliknya (bisa nulis walau RLS
-- reactions gak ngizinin anon nulis langsung), TAPI cuma bisa ngerjain
-- persis apa yang ditulis di dalam function ini -- nambah 1 ke counter,
-- gak lebih. Aman dipanggil publik tanpa login.
create or replace function increment_reaction(emoji_key text, delta int default 1)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update reactions set count = greatest(count + delta, 0) where emoji = emoji_key;
end;
$$;

grant execute on function increment_reaction(text, int) to anon, authenticated;

-- ============================================================
-- Trigger: auto-update kolom updated_at di holdings
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_holdings_updated_at
before update on holdings
for each row execute function set_updated_at();

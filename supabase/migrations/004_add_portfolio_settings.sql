-- Jalankan ini di Supabase SQL Editor.
-- Nambahin tabel portfolio_settings buat nyimpen nilai tunggal
-- kayak "Sisa Cash" yang gak masuk kategori tabel manapun yang udah ada.

create table if not exists portfolio_settings (
  id int primary key default 1,
  sisa_cash numeric default 0,
  updated_at timestamptz default now()
);

alter table portfolio_settings enable row level security;

create policy "public_read_settings" on portfolio_settings for select using (true);

-- Isi 1 baris awal -- GANTI angka 906742 ini ke sisa cash lo yang
-- sebenernya sebelum run, atau edit lagi nanti lewat halaman admin.
insert into portfolio_settings (id, sisa_cash) values (1, 906742)
on conflict (id) do nothing;

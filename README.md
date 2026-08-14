# Portofolio Palsu — pp.sahamdarinol.com

> 📖 **Ini repo publik buat edukasi** — nunjukin cara bikin web tracker
> portofolio saham member-only dari nol (Vite + React + Supabase + Vercel).
> Data di `seed.sql` itu CONTOH DOANG, bukan data portofolio asli. Kalau
> mau pakai buat portofolio lo sendiri, ganti semua data & password
> sebelum deploy, dan **jangan pernah commit password/data asli ke repo
> publik**.

Web app member-only buat nampilin portofolio saham + auto-update harga.
Data **beneran kekunci di level database** (bukan cuma disembunyiin di
tampilan) — orang harus lolos password bulanan dulu baru bisa liat apa-apa.
Editing dilakuin langsung dari halaman yang sama, gak ada `/admin` terpisah.

Stack: **Vite + React** (frontend) + **Supabase** (database, RLS full-lock,
gak ada baca publik sama sekali) + **Vercel** (hosting + serverless
function buat auth & baca/tulis data) + **cron-job.org** (jadwal auto-update
harga, gantiin GitHub Actions yang kurang reliable).

---

## 1. Alur akses (baca ini dulu biar ngerti keseluruhan sistem)

Ada **2 lapis password terpisah**, independen satu sama lain:

1. **Password Member** — gate buat SELURUH halaman. Gak lolos ini,
   browser gak dapet data apapun dari server (bukan cuma disembunyiin,
   emang gak dikirim). Dibagiin ke member berbayar lewat Community Post
   YouTube / Discord, diganti manual lewat admin kapan aja.
2. **Password Admin** — gate tambahan buat mode edit (`+Tambah`,
   `Edit`, `Hapus` di tiap tabel). Ini kepisah dari password member —
   harus lolos gate member DULU baru bisa masuk mode admin.

Kedua password ini **disimpen di database** (`portfolio_settings` table),
BUKAN di environment variable — jadi bisa diganti kapan aja langsung dari
halaman itu sendiri, gak perlu buka Vercel atau redeploy apapun.

---

## 2. Setup Supabase

1. Buat project baru di [supabase.com/dashboard](https://supabase.com/dashboard)
   (kalau mulai dari nol) atau pakai yang udah ada.
2. Buka **SQL Editor** → **New query**, jalanin **berurutan**:
   - `supabase/schema.sql`
   - `supabase/seed.sql` (import data + password awal — inget ganti
     placeholder password di file ini sebelum run kalau install baru)
   - Kalau project udah lebih dulu jalan (bukan instalasi baru), jalanin
     semua file di `supabase/migrations/` **berurutan sesuai nomornya**
     (001 sampai 007 minimal). Semua migration aman dijalanin ulang
     (pakai `if exists` / `on conflict do nothing`).
3. **PENTING**: buka `supabase/migrations/007_member_gate_lock_reads.sql`,
   cari baris `update portfolio_settings set member_password = ...`,
   ganti ke password beneran sebelum di-run — ini yang bikin gate-nya
   bisa dipakai dari awal.
4. **Gak ada setting Authentication apapun** — sistem ini gak pakai
   Supabase Auth sama sekali, login pakai password custom yang dicek di
   server (lihat bagian arsitektur di bawah).
5. Ambil 3 nilai dari **Project Settings → API**: `Project URL`,
   `anon`/`publishable` key, `service_role`/`secret` key.

---

## 3. Environment Variables (Vercel)

| Key | Dipakai buat |
|---|---|
| `VITE_SUPABASE_URL` | Frontend — cuma dipake buat RPC `increment_reaction` (klik emoji), BUKAN buat baca data tabel |
| `VITE_SUPABASE_ANON_KEY` | sda |
| `SUPABASE_URL` | Server (`api/*.js`) — service role, baca/tulis semua data |
| `SUPABASE_SERVICE_ROLE_KEY` | sda |
| `CRON_SECRET` | Ngunci endpoint `/api/update-prices` biar cuma cron-job.org yang bisa manggil |
| `ADMIN_PASSWORD` | Password mode admin (edit data) — **beda** dari password member |
| `ADMIN_SESSION_SECRET` | Random string buat nandatanganin session cookie, dipake buat **kedua** jenis sesi (admin & member) |

`ADMIN_PASSWORD` & `ADMIN_SESSION_SECRET` bikin sendiri (`openssl rand -hex 32`
buat yang secret). Password member gak ada di env var — itu di database,
diganti lewat tombol "Ganti Password Member" pas login sebagai admin.

---

## 4. Deploy ke Vercel

1. Push repo ini ke GitHub, import ke [vercel.com/new](https://vercel.com/new).
2. Isi 7 environment variables di atas sebelum Deploy.
3. Settings → Domains → tambahin `pp.sahamdarinol.com`, ikutin instruksi
   CNAME/TXT record dari Vercel ke DNS provider domain lo.

---

## 5. Auto-update harga (cron-job.org, BUKAN GitHub Actions)

GitHub Actions scheduled workflow ternyata sering telat/skip (keterbatasan
platform-nya, bukan bug kita). Sekarang pakai [cron-job.org](https://cron-job.org)
(gratis):

1. Bikin akun, Create Cronjob.
2. URL: `https://pp-sahamdarinol.vercel.app/api/update-prices` (URL
   `.vercel.app` ini permanen, gak perlu diganti walau udah pasang custom
   domain).
3. Header: `Authorization: Bearer <CRON_SECRET>` (samain sama env var).
4. Jadwal custom: `*/5 9-16 * * 1-5` (tiap 5 menit, jam 9-16 WIB, Senin-Jumat).

---

## 6. Cara pakai sehari-hari

- **Publik**: buka `pp.sahamdarinol.com` → kena gate password member dulu.
- **Masuk sebagai member**: masukin password bulanan (dari Community
  Post). Sesi ini disimpen 30 hari, gak perlu login ulang tiap buka.
- **Masuk sebagai admin**: setelah lolos gate member, klik
  "🔒 Masuk sebagai admin" di kanan atas, masukin `ADMIN_PASSWORD`.
- **Ganti password member**: login admin → klik "Ganti Password Member"
  di header → langsung aktif, gak perlu redeploy.
- **Edit data** (holdings, saham terjual, dividen, sisa cash, pengumuman):
  tombol `+Tambah` / `Edit` / `Hapus` muncul otomatis di tiap section pas
  mode admin aktif.
- **Logo emiten**: taro file `public/logos/{KODE_SAHAM}.png` (huruf besar,
  persis kode saham) — otomatis kepake, gak perlu ubah kode. Kalau gak
  ada file lokal, fallback ke favicon domain resmi (`src/lib/tickerDomains.js`),
  kalau itu juga gak ada, fallback ke avatar inisial berwarna.
- **Reaction emoji**: publik bisa klik (5 emoji positif, klik lagi buat undo),
  gak perlu login sama sekali — ini jalur terpisah yang sengaja tetep publik
  (lewat Postgres function `increment_reaction` yang cuma bisa nambah/ngurang
  angka, gak bisa baca data lain).

---

## 7. Kenapa ini beneran aman (bukan cuma gate tampilan)?

RLS Supabase di semua tabel data (`holdings`, `closed_positions`,
`dividends`, `portfolio_settings`) **sengaja gak punya policy baca publik
sama sekali**. Anon key yang nempel di kode frontend gak bisa baca apa-apa
langsung dari tabel-tabel itu, walau di-inspect lewat DevTools sekalipun.
Satu-satunya jalan baca data: endpoint `/api/data` di server, yang ngecek
cookie sesi member (HMAC-signed, httpOnly, gak bisa dibaca JavaScript)
sebelum baru ambil data pakai `service_role` key — kunci penuh yang
**gak pernah** dikirim ke browser.

Sama buat tulis data: `/api/admin/mutate` ngecek cookie sesi admin
(terpisah dari sesi member) sebelum ngerjain insert/update/delete,
juga pakai `service_role` key di server.

---

## 8. Struktur project

```
pp-sahamdarinol/
├── api/
│   ├── lib/session.js          # sign/verify cookie, support 2 jenis sesi (admin & member)
│   ├── admin-login.js          # cek ADMIN_PASSWORD (env var), set cookie admin
│   ├── admin-logout.js
│   ├── admin-check.js
│   ├── admin/mutate.js         # SATU-SATUNYA jalan tulis data (insert/update/delete)
│   ├── member-login.js         # cek member_password (dari DB), set cookie member
│   ├── member-logout.js
│   ├── member-check.js
│   ├── data.js                 # SATU-SATUNYA jalan baca data, wajib sesi member valid
│   └── update-prices.js        # dipanggil cron-job.org tiap 5 menit jam bursa
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js   # anon key -- cuma dipake buat RPC increment_reaction
│   │   ├── calc.js             # semua kalkulasi turunan (∆%, yield, dll)
│   │   ├── adminApi.js         # fetch helper ke /api/admin-*
│   │   ├── memberApi.js        # fetch helper ke /api/member-* dan /api/data
│   │   ├── fieldConfig.js      # definisi kolom form admin per tabel
│   │   └── tickerDomains.js    # mapping kode saham -> domain resmi (buat favicon fallback)
│   ├── components/
│   │   ├── AdminRowForm.jsx        # form tambah/edit generik per tabel
│   │   ├── MemberPasswordForm.jsx  # form khusus ganti password member
│   │   └── TickerBadge.jsx         # icon saham: logo lokal -> favicon domain -> avatar inisial
│   ├── pages/
│   │   └── Portfolio.jsx       # satu-satunya halaman: gate member -> konten -> admin inline
│   ├── App.jsx
│   └── index.css
├── public/
│   ├── favicon-32.png / favicon-180.png / favicon-512.png
│   └── logos/{KODE}.png        # logo custom per saham, opsional
├── supabase/
│   ├── schema.sql               # skema lengkap buat instalasi baru
│   ├── seed.sql                 # data awal (holdings, closed, dividends, settings, reactions)
│   └── migrations/              # 001-007+, jalanin berurutan kalau project udah jalan duluan
└── vercel.json
```

## 9. Troubleshooting yang udah pernah kejadian (dan solusinya)

- **Fitur udah di-push tapi gak jalan di web** → paling sering karena
  ada file yang kelewat pas copy-paste manual. Cek langsung di
  github.com apa isi file itu emang udah versi baru (bukan cuma
  cek nama file-nya ada). Kalau isinya udah bener tapi tetep gak jalan,
  cek DevTools → tab Network → reload → lihat apa request yang
  diharapkan beneran kekirim dan status code-nya apa.
- **Commit gak muncul apa-apa di GitHub Desktop padahal udah copy file** →
  kemungkinan file ke-copy ke folder yang salah (bukan folder yang
  di-track GitHub Desktop). Klik Repository → Show in Finder/Explorer
  dari GitHub Desktop buat mastiin lokasi yang bener.
- **Copy folder yang isinya sebagian file ke folder yang udah ada isinya** →
  pilih **Merge**, JANGAN **Replace** (Replace bakal ngehapus semua file
  lain yang gak ada di folder sumber).
- **`.git` ilang / "isn't a Git repository"** → biasanya kejadian karena
  gak sengaja ke-select & ke-delete pas "select all" di folder yang sama
  dengan folder extract zip. Clone ulang ke folder BEDA dari folder
  tempat extract zip, biar gak ketuker lagi.

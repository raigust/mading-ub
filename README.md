# PapanUB

Papan informasi mahasiswa Universitas Brawijaya untuk beasiswa, organisasi/UKM/ormek, acara, kompetisi, dan pengumuman kampus.

## Jalankan lokal

Prasyarat: Node.js 20.9 atau lebih baru.

 Jika belum ada, salin `apps/api/.env.example` menjadi `apps/api/.env`, lalu isi `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` dari Supabase **Project Settings → API Keys → Secret key** (atau legacy `service_role`). Jangan masukkan publishable key ke variabel ini dan jangan bagikan secret key. Di PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

```bash
npm install
npm run db:seed
npm run dev
```

Sebelum mengisi konten, jalankan isi `apps/api/supabase/schema.sql` sekali di Supabase **SQL Editor**. Untuk memasukkan 9 data contoh tanpa menyiapkan secret lokal, jalankan `apps/api/supabase/seed.sql` di SQL Editor. API lokal dan production sama-sama memakai Supabase Data API; tidak ada koneksi PostgreSQL langsung atau Prisma. `SUPABASE_URL` adalah project root (`https://<project-ref>.supabase.co`), bukan URL yang diakhiri `/rest/v1` karena SDK menambahkan path Data API sendiri.

Buka `http://localhost:3000`. API tersedia di `http://localhost:4000/api`; pemeriksaan kesehatan ada di `/api/health`.

## Admin superadmin

Buka `http://localhost:3000/admin/login` dan masuk dengan akun demo:

- Username: `admin`
- Password: `admin123`

Dashboard `/admin` menyediakan pencarian, filter kategori, ringkasan konten, serta create, edit, dan delete untuk semua informasi. Profil dan password dapat diubah di `/admin/profile`; password saat ini wajib diverifikasi, password disimpan sebagai bcrypt hash, password baru minimal 12 karakter, dan perubahan profil mencabut sesi lain. Sesi memakai cookie `HttpOnly`, `SameSite=Lax`, secure di production, dan berlaku 2 jam. Login dibatasi 5 percobaan per 15 menit per IP.

Kredensial di atas hanya untuk development lokal. Jangan deploy dengan password atau session secret contoh. Isi `ADMIN_PASSWORD` bootstrap dengan password acak minimal 12 karakter sebelum login pertama di production, isi `ADMIN_SESSION_SECRET` dengan secret acak minimal 32 karakter, kemudian ubah password melalui halaman Profil Admin. Password hanya dipakai untuk bootstrap akun pertama dan disimpan di database sebagai hash bcrypt.

## Rencana deploy Vercel

Rekomendasi untuk stack ini: frontend Next.js di Vercel, backend Express sebagai project Vercel terpisah, dan database PostgreSQL di Supabase. Jangan gunakan SQLite untuk production/serverless karena filesystem function bukan penyimpanan persisten.

1. Di Supabase buka **SQL Editor**, salin dan jalankan seluruh isi `apps/api/supabase/schema.sql` satu kali untuk membuat tabel dengan RLS aktif. Data API memakai project URL dan key server, jadi transaction/session pooler maupun password database tidak diperlukan oleh API runtime.
2. Buat Redis database di Upstash dan simpan REST URL/token.
3. Push perubahan terbaru ke GitHub. Import repo ke Vercel sebagai project API dengan **Root Directory** `apps/api`, Framework preset **Other**, Build Command `npm run build:production`, dan Output Directory kosong. Entry Express `src/index.ts` mengekspor app untuk Vercel Function.
4. Tambahkan pada project API: `SUPABASE_URL=https://qauqutgpecvwoxjkpjfo.supabase.co`, `SUPABASE_SECRET_KEY` (Secret key, atau legacy `service_role`), `WEB_ORIGIN=https://mading-ub.vercel.app`, `ADMIN_USERNAME=admin`, password bootstrap acak minimal 12 karakter, `ADMIN_SESSION_SECRET` acak minimal 32 karakter, `ADMIN_EMAIL`, `UPSTASH_REDIS_REST_URL`, dan `UPSTASH_REDIS_REST_TOKEN`. Template ada di `apps/api/production.env.example`; masukkan rahasia langsung di Vercel. Jangan gunakan publishable key sebagai backend secret.
5. Setelah API project deploy, buka `<API-VERCEL-URL>/api/health`; harus menjawab `{"status":"ok","service":"papanub-api"}`. Catat URL project API.
6. Pada project web Vercel yang sudah ada, set `API_ORIGIN` ke URL API (contoh `https://papanub-api.vercel.app`). Biarkan `NEXT_PUBLIC_SUPABASE_URL` dan publishable key yang sudah ada. Browser otomatis memakai `/api/...` pada host frontend; rewrite Next.js meneruskannya ke API sehingga cookie login tetap same-origin. `NEXT_PUBLIC_API_URL` tidak diperlukan pada production. Redeploy frontend setelah menyimpan environment variable.
7. Seed konten opsional: isi `SUPABASE_URL` dan `SUPABASE_SECRET_KEY` pada terminal lokal, lalu jalankan `npm run db:seed`; atau masukkan SQL schema saja dan buat konten melalui admin. Coba login di `https://mading-ub.vercel.app/admin/login` dengan bootstrap username/password. Setelah berhasil, ganti password lewat Profil Admin dan hapus `ADMIN_PASSWORD` dari environment API lalu redeploy API.

Supabase service/secret key melewati Row Level Security, sehingga key hanya berada di API Express; RLS aktif dan browser tidak diberi policy langsung. Semua query posts/admin berjalan dari Express dengan autentikasi sesi admin. Jangan taruh secret key di Git, `NEXT_PUBLIC_*`, browser, atau chat.

Catatan keamanan deploy: pada production, Express menolak start jika Upstash Redis belum dikonfigurasi; buat database Redis di Upstash dan isi `UPSTASH_REDIS_REST_URL` serta `UPSTASH_REDIS_REST_TOKEN` di project API Vercel. Limiter terdistribusi membatasi 5 login per IP tiap 15 menit di semua instance. Development lokal memakai limiter memory. Browser memanggil API melalui rewrite same-origin; `API_ORIGIN` adalah URL server-side dan tidak diekspos ke browser.

Dokumentasi: [Vercel: Express](https://vercel.com/guides/using-express-with-vercel), [Vercel: Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [Supabase: Data API](https://supabase.com/docs/guides/api), [Supabase: API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Stack

- `apps/web`: Next.js App Router, React, TypeScript, Tailwind CSS, dan Lucide.
- `apps/api`: Express, TypeScript, bcrypt, dan Supabase Data API melalui `@supabase/supabase-js`.
- Root `npm run dev` menjalankan frontend dan API bersamaan.

## Supabase SSR Auth

Frontend memiliki Supabase browser/server clients di `apps/web/src/utils/supabase` dan `apps/web/src/proxy.ts` memperbarui sesi Supabase Auth memakai `auth.getClaims()`. Variabel lokal ada di `apps/web/.env.local` (tidak masuk Git); gunakan `apps/web/.env.example` sebagai template untuk environment lain.

Integrasi ini hanya menyiapkan client dan refresh sesi Supabase Auth. Halaman tidak membaca tabel `todos` dari contoh tutorial karena tabel tersebut belum ada. Login superadmin dan CRUD mading tetap memakai sesi Express tersendiri sampai alur auth sengaja dimigrasikan; membuat user Supabase Auth tidak otomatis memberi hak superadmin.

## Deploy frontend ke Vercel

Frontend bisa dideploy lebih dulu dari repo ini dengan **Root Directory** `apps/web`. Vercel akan mendeteksi Next.js dan menjalankan build otomatis. Tambahkan environment variables berikut pada Vercel project frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_ORIGIN` setelah Express API dideploy, misalnya `https://papanub-api.vercel.app`
- `API_ORIGIN` yang menunjuk ke project API Vercel

Jika API belum dikonfigurasi, situs production tidak akan mencoba menghubungi `localhost`: beranda menampilkan data contoh yang tertanam di frontend. Login admin, dashboard, dan edit profil belum bisa digunakan sampai API Express tersedia. Supabase Auth SSR yang disiapkan di atas belum menggantikan login admin Express.

Langkah deploy: push project ke GitHub, import repo ke Vercel, set Root Directory ke `apps/web`, masukkan dua environment variable Supabase dan `API_ORIGIN`, lalu deploy. Jangan menaruh database URL atau secret backend ke environment variable `NEXT_PUBLIC_*`.

Konten seed adalah contoh untuk demonstrasi. Pastikan detail, tanggal, dan persyaratan diverifikasi lewat sumber resmi penyelenggara sebelum dipublikasikan.
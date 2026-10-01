# PapanUB

Papan informasi mahasiswa Universitas Brawijaya untuk beasiswa, organisasi/UKM/ormek, acara, kompetisi, dan pengumuman kampus.

## Jalankan lokal

Prasyarat: Node.js 20.9 atau lebih baru.

Jika belum ada, salin `apps/api/.env.example` menjadi `apps/api/.env` terlebih dahulu. Di PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Development lokal memakai `apps/api/prisma/schema.local.prisma` dan SQLite (`apps/api/.env`). Schema default `apps/api/prisma/schema.prisma` khusus PostgreSQL production. `npm run db:generate`/`npm run db:push` di root memilih schema lokal; API dev juga generate client SQLite sebelum start.

Buka `http://localhost:3000`. API tersedia di `http://localhost:4000/api`; pemeriksaan kesehatan ada di `/api/health`.

## Admin superadmin

Buka `http://localhost:3000/admin/login` dan masuk dengan akun demo:

- Username: `admin`
- Password: `admin123`

Dashboard `/admin` menyediakan pencarian, filter kategori, ringkasan konten, serta create, edit, dan delete untuk semua informasi. Profil dan password dapat diubah di `/admin/profile`; password saat ini wajib diverifikasi, password disimpan sebagai bcrypt hash, password baru minimal 12 karakter, dan perubahan profil mencabut sesi lain. Sesi memakai cookie `HttpOnly`, `SameSite=Lax`, secure di production, dan berlaku 2 jam. Login dibatasi 5 percobaan per 15 menit per IP.

Kredensial di atas hanya untuk development lokal. Jangan deploy dengan password atau session secret contoh. Isi `ADMIN_PASSWORD` bootstrap dengan password acak minimal 12 karakter sebelum login pertama di production, isi `ADMIN_SESSION_SECRET` dengan secret acak minimal 32 karakter, kemudian ubah password melalui halaman Profil Admin. Password hanya dipakai untuk bootstrap akun pertama dan disimpan di database sebagai hash bcrypt.

## Rencana deploy Vercel

Rekomendasi untuk stack ini: frontend Next.js di Vercel, backend Express sebagai project Vercel terpisah, dan database PostgreSQL di Supabase. Jangan gunakan SQLite untuk production/serverless karena filesystem function bukan penyimpanan persisten.

1. Di Supabase buka **Connect**, salin Transaction pooler (`6543`) dan Session pooler (`5432`). Isi connection strings ke `apps/api/.env` secara lokal untuk inisialisasi database; jangan kirim password kepada saya. Untuk schema kosong jalankan `npm run db:generate -w @papan-ub/api` lalu `npm run db:push:production`. Seed contoh opsional: `npm run db:seed:production -w @papan-ub/api`.
2. Buat Redis database di Upstash dan simpan REST URL/token.
3. Push perubahan terbaru ke GitHub. Import repo ke Vercel sebagai project API dengan **Root Directory** `apps/api`, Framework preset **Other**, Build Command `npm run build:production`, dan Output Directory kosong. Entry Express `src/index.ts` mengekspor app untuk Vercel Function.
4. Tambahkan pada project API: `DATABASE_URL`, `DIRECT_URL`, `WEB_ORIGIN=https://mading-ub.vercel.app`, `ADMIN_USERNAME=admin`, password bootstrap acak minimal 12 karakter, `ADMIN_SESSION_SECRET` acak minimal 32 karakter, `ADMIN_EMAIL`, `UPSTASH_REDIS_REST_URL`, dan `UPSTASH_REDIS_REST_TOKEN`. Template daftar variable non-secret ada di `apps/api/production.env.example`; isi rahasia langsung di Vercel.
5. Setelah API project deploy, buka `<API-VERCEL-URL>/api/health`; harus menjawab `{"status":"ok","service":"papanub-api"}`. Catat URL project API.
6. Pada project web Vercel yang sudah ada, set `API_ORIGIN` ke URL API (contoh `https://papanub-api.vercel.app`) dan `NEXT_PUBLIC_API_URL=/`. Biarkan `NEXT_PUBLIC_SUPABASE_URL` dan publishable key yang sudah ada. Rewrite Next.js meneruskan `/api/...` dari host frontend ke API sehingga cookie login tetap same-origin. Redeploy frontend setelah menyimpan environment variable.
7. Coba login di `https://mading-ub.vercel.app/admin/login` dengan bootstrap username/password. Setelah berhasil, ganti password lewat Profil Admin dan hapus `ADMIN_PASSWORD` dari environment API lalu redeploy API.

Untuk dev, `npm run build` dan schema `schema.local.prisma` tetap memakai SQLite. Untuk API Vercel gunakan `npm run build:production` yang menghasilkan client PostgreSQL. Jangan jalankan schema SQLite lokal terhadap Supabase. Jangan taruh connection strings/password/token di Git, `NEXT_PUBLIC_*`, atau chat.

Catatan keamanan deploy: pada production, Express menolak start jika Upstash Redis belum dikonfigurasi; buat database Redis di Upstash dan isi `UPSTASH_REDIS_REST_URL` serta `UPSTASH_REDIS_REST_TOKEN` di project API Vercel. Limiter terdistribusi membatasi 5 login per IP tiap 15 menit di semua instance. Development lokal memakai limiter memory. Browser memanggil API melalui rewrite same-origin; `API_ORIGIN` adalah URL server-side dan tidak diekspos ke browser.

Dokumentasi: [Vercel: Express](https://vercel.com/guides/using-express-with-vercel), [Vercel: Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma), [Supabase: koneksi PostgreSQL dan pooler](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Stack

- `apps/web`: Next.js App Router, React, TypeScript, Tailwind CSS, dan Lucide.
- `apps/api`: Express, TypeScript, Prisma; SQLite untuk development lokal dan PostgreSQL Supabase untuk production.
- Root `npm run dev` menjalankan frontend dan API bersamaan.

## Supabase SSR Auth

Frontend memiliki Supabase browser/server clients di `apps/web/src/utils/supabase` dan `apps/web/src/proxy.ts` memperbarui sesi Supabase Auth memakai `auth.getClaims()`. Variabel lokal ada di `apps/web/.env.local` (tidak masuk Git); gunakan `apps/web/.env.example` sebagai template untuk environment lain.

Integrasi ini hanya menyiapkan client dan refresh sesi Supabase Auth. Halaman tidak membaca tabel `todos` dari contoh tutorial karena tabel tersebut belum ada. Login superadmin dan CRUD mading tetap memakai sesi Express tersendiri sampai alur auth sengaja dimigrasikan; membuat user Supabase Auth tidak otomatis memberi hak superadmin.

## Deploy frontend ke Vercel

Frontend bisa dideploy lebih dulu dari repo ini dengan **Root Directory** `apps/web`. Vercel akan mendeteksi Next.js dan menjalankan build otomatis. Tambahkan environment variables berikut pada Vercel project frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `API_ORIGIN` setelah Express API dideploy, misalnya `https://papanub-api.vercel.app`
- `NEXT_PUBLIC_API_URL=/` agar browser memanggil API melalui rewrite pada origin frontend yang sama

Jika API belum dikonfigurasi, situs production tidak akan mencoba menghubungi `localhost`: beranda menampilkan data contoh yang tertanam di frontend. Login admin, dashboard, dan edit profil belum bisa digunakan sampai API Express tersedia. Supabase Auth SSR yang disiapkan di atas belum menggantikan login admin Express.

Langkah deploy: push project ke GitHub, import repo ke Vercel, set Root Directory ke `apps/web`, masukkan dua environment variable Supabase, `API_ORIGIN`, serta `NEXT_PUBLIC_API_URL=/`, lalu deploy. Jangan menaruh database URL atau secret backend ke environment variable `NEXT_PUBLIC_*`.

Konten seed adalah contoh untuk demonstrasi. Pastikan detail, tanggal, dan persyaratan diverifikasi lewat sumber resmi penyelenggara sebelum dipublikasikan.
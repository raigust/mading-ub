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

Buka `http://localhost:3000`. API tersedia di `http://localhost:4000/api`; pemeriksaan kesehatan ada di `/api/health`.

## Admin superadmin

Buka `http://localhost:3000/admin/login` dan masuk dengan akun demo:

- Username: `admin`
- Password: `admin123`

Dashboard `/admin` menyediakan pencarian, filter kategori, ringkasan konten, serta create, edit, dan delete untuk semua informasi. Profil dan password dapat diubah di `/admin/profile`; password saat ini wajib diverifikasi, password disimpan sebagai bcrypt hash, password baru minimal 12 karakter, dan perubahan profil mencabut sesi lain. Sesi memakai cookie `HttpOnly`, `SameSite=Lax`, secure di production, dan berlaku 2 jam. Login dibatasi 5 percobaan per 15 menit per IP.

Kredensial di atas hanya untuk development lokal. Jangan deploy dengan password atau session secret contoh. Isi `ADMIN_PASSWORD` bootstrap dengan password acak minimal 12 karakter sebelum login pertama di production, isi `ADMIN_SESSION_SECRET` dengan secret acak minimal 32 karakter, kemudian ubah password melalui halaman Profil Admin. Password hanya dipakai untuk bootstrap akun pertama dan disimpan di database sebagai hash bcrypt.

## Rencana deploy Vercel

Rekomendasi untuk stack ini: frontend Next.js di Vercel, backend Express sebagai project Vercel terpisah, dan database PostgreSQL di Supabase. Jangan gunakan SQLite untuk production/serverless karena filesystem function bukan penyimpanan persisten.

1. Buat project Supabase PostgreSQL. Dari menu **Connect**, salin connection string **Transaction pooler** untuk runtime serverless dan **Session pooler** untuk migrasi Prisma. Dokumentasi Supabase menyarankan transaction pooler bagi fungsi serverless; Prisma memakai URL migrasi terpisah.
2. Untuk target production, ubah datasource `apps/api/prisma/schema.prisma` dari `sqlite` ke `postgresql`, dan tambahkan `directUrl = env("DIRECT_URL")` pada datasource. Isi `DATABASE_URL` dengan URL transaction pooler port `6543` dan `?pgbouncer=true&connection_limit=1`; isi `DIRECT_URL` dengan URL session pooler port `5432`. Database Supabase yang masih kosong dapat disiapkan sekali dengan `npm run db:push` setelah schema/provider dan environment diarahkan ke PostgreSQL. Untuk perubahan schema selanjutnya buat migration di development memakai `npm run db:migrate:dev -w @papan-ub/api -- --name nama_perubahan`, commit folder migration, lalu jalankan `npm run db:migrate:deploy` sebagai langkah deploy. Data seed contoh tidak perlu dipindahkan; jalankan seed setelah migrasi jika ingin konten demo.
3. Push repo ke Git provider. Buat project Vercel untuk frontend dengan **Root Directory** `apps/web`; buat project kedua untuk API dengan **Root Directory** `apps/api`. Entry Express mengekspor `app` dan dapat dijalankan sebagai Vercel Function. Hindari menyetel API sebagai server persisten yang bergantung pada satu proses lokal.
4. Gunakan domain khusus yang satu site, misalnya `mading.domain.id` dan `api.domain.id`. Pada project API set `WEB_ORIGIN=https://mading.domain.id`, `DATABASE_URL`, `DIRECT_URL`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`, dan `UPSTASH_REDIS_REST_TOKEN`. Pada project web set `NEXT_PUBLIC_API_URL=https://api.domain.id`. Setelah mengganti environment variable, redeploy kedua project. Origin harus persis cocok dan tanpa slash akhir.
5. Siapkan schema produksi dari mesin lokal yang dipercaya, lalu verifikasi `/api/health`, login admin, CRUD, dan CORS. Setelah akun bootstrap berhasil dibuat, hapus `ADMIN_PASSWORD` dari environment Vercel; autentikasi berikutnya memakai bcrypt hash di tabel `AdminUser`. Buat `ADMIN_SESSION_SECRET` dengan password manager atau generator kriptografis. Jangan menaruh connection string, password, atau token di Git, `NEXT_PUBLIC_*`, browser, maupun chat.

Catatan keamanan deploy: pada production, Express menolak start jika Upstash Redis belum dikonfigurasi; buat database Redis di Upstash dan isi `UPSTASH_REDIS_REST_URL` serta `UPSTASH_REDIS_REST_TOKEN` di project API Vercel. Limiter terdistribusi membatasi 5 login per IP tiap 15 menit di semua instance. Development lokal memakai limiter memory. Cookie lintas origin membutuhkan `credentials: include`, HTTPS, `WEB_ORIGIN` yang tepat, dan frontend/API pada subdomain domain khusus yang sama.

Dokumentasi: [Vercel: Express](https://vercel.com/guides/using-express-with-vercel), [Vercel: Node.js runtime](https://vercel.com/docs/functions/runtimes/node-js), [Supabase: Prisma](https://supabase.com/docs/guides/database/prisma), [Supabase: koneksi PostgreSQL dan pooler](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Stack

- `apps/web`: Next.js App Router, React, TypeScript, Tailwind CSS, dan Lucide.
- `apps/api`: Express, TypeScript, Prisma, dan SQLite.
- Root `npm run dev` menjalankan frontend dan API bersamaan.

Konten seed adalah contoh untuk demonstrasi. Pastikan detail, tanggal, dan persyaratan diverifikasi lewat sumber resmi penyelenggara sebelum dipublikasikan.
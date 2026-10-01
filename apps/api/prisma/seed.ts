import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const posts = [
  { title: "Beasiswa Djarum Plus 2026/2027", category: "Beasiswa", organization: "Djarum Foundation", description: "Kesempatan untuk mahasiswa berprestasi yang ingin berkembang lewat Nation Building, Character Building, Leadership Development, Competition Challenges, dan International Exposure.", date: "01 Okt 2026", deadline: "20 Nov 2026", location: "Pendaftaran online", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85", color: "lime", tag: "Pendaftaran dibuka", featured: true },
  { title: "Open Recruitment — BEM UB 2026", category: "Organisasi", organization: "BEM Universitas Brawijaya", description: "Saatnya bawa ide dan energimu untuk Brawijaya. Pendaftaran terbuka untuk mahasiswa aktif semua fakultas. Kenali departemen, program kerja, dan alur seleksi melalui laman resmi BEM UB.", date: "30 Sep 2026", deadline: "12 Okt 2026", location: "Gedung Samantha Krida", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85", color: "pink", tag: "Rekrutmen" },
  { title: "UB Career Talk: Karier di Era AI", category: "Acara", organization: "Career Development Center UB", description: "Ngobrol bareng praktisi teknologi tentang skill yang dicari industri, membangun portofolio, dan menavigasi karier di tengah perkembangan AI. Terbuka untuk seluruh mahasiswa UB.", date: "08 Okt 2026", deadline: "07 Okt 2026", location: "Zoom Webinar · 13.00 WIB", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85", color: "blue", tag: "Webinar" },
  { title: "Gemastik XIX — Saatnya Unjuk Karya", category: "Kompetisi", organization: "Pusat Prestasi Nasional", description: "Kompetisi nasional bidang TIK untuk mahasiswa. Bentuk tim, pilih cabang lomba, dan siapkan inovasi terbaikmu. Jadwal seleksi dan panduan teknis tersedia di kanal resmi Gemastik.", date: "28 Sep 2026", deadline: "18 Okt 2026", location: "Kompetisi nasional", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85", color: "orange", tag: "Kompetisi nasional" },
  { title: "Beasiswa Unggulan Kemendikbudristek", category: "Beasiswa", organization: "Kemendikbudristek", description: "Dukungan biaya pendidikan bagi putra-putri terbaik bangsa. Siapkan dokumen akademik, esai kontribusi, dan surat rekomendasi sebelum mengisi pendaftaran.", date: "26 Sep 2026", deadline: "15 Okt 2026", location: "Pendaftaran online", image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=85", color: "yellow", tag: "S1 · S2 · S3" },
  { title: "Penerimaan Anggota Baru — UB Radio", category: "Organisasi", organization: "UB Radio 104.4 FM", description: "Punya suara, cerita, atau rasa ingin tahu yang besar? UB Radio membuka pintu untuk penyiar, reporter, produser, dan tim kreatif. Temukan ruangmu di balik siaran.", date: "25 Sep 2026", deadline: "10 Okt 2026", location: "Studio UB Radio", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85", color: "violet", tag: "UKM · Media" },
  { title: "Open House Organisasi Ekstra Kampus", category: "Organisasi", organization: "Ruang diskusi mahasiswa", description: "Kenali ragam organisasi ekstra kampus, ruang diskusinya, dan kegiatan sosialnya. Sesi ini contoh konten demonstrasi; cek kanal organisasi terkait untuk jadwal dan pendaftaran yang sebenarnya.", date: "30 Sep 2026", deadline: "14 Okt 2026", location: "Area kampus UB", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85", color: "pink", tag: "ORMEK" },
  { title: "Brawijaya Innovation Week 2026", category: "Kompetisi", organization: "UB Innovation Center", description: "Pamerkan solusi inovatifmu di bidang pangan, kesehatan, energi, dan teknologi digital. Ada mentoring, jejaring industri, serta total hadiah puluhan juta rupiah.", date: "24 Sep 2026", deadline: "25 Okt 2026", location: "Gor Pertamina UB", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=900&q=85", color: "green", tag: "Call for ideas" },
  { title: "Perubahan Jadwal Layanan Akademik", category: "Pengumuman", organization: "Direktorat Administrasi Akademik", description: "Layanan administrasi akademik pada Jumat, 9 Oktober 2026 akan tutup pukul 11.00 WIB karena kegiatan internal. Layanan kembali normal pada hari kerja berikutnya.", date: "01 Okt 2026", location: "Seluruh fakultas", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85", color: "red", tag: "Info kampus" },
];

async function main() {
  for (const post of posts) {
    await prisma.post.upsert({
      where: { title: post.title },
      update: post,
      create: post,
    });
  }
  console.log(`Seeded ${posts.length} PapanUB posts`);
}

main().finally(() => prisma.$disconnect());
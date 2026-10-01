"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpRight,
  Bell,
  Bookmark,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  GraduationCap,
  LayoutGrid,
  Megaphone,
  Menu,
  Search,
  Sparkles,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";

type Category = "Beasiswa" | "Organisasi" | "Acara" | "Kompetisi" | "Pengumuman";
type Post = {
  id: string;
  title: string;
  category: Category;
  organization: string;
  description: string;
  date: string;
  deadline?: string;
  location?: string;
  sourceUrl?: string | null;
  image: string;
  color: string;
  tag: string;
};

const initialPosts: Post[] = [
  {
    id: "1", title: "Beasiswa Djarum Plus 2026/2027", category: "Beasiswa", organization: "Djarum Foundation",
    description: "Kesempatan untuk mahasiswa berprestasi yang ingin berkembang lewat Nation Building, Character Building, Leadership Development, Competition Challenges, dan International Exposure.",
    date: "01 Okt 2026", deadline: "20 Nov 2026", location: "Pendaftaran online", image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85", color: "lime", tag: "Pendaftaran dibuka",
  },
  {
    id: "2", title: "Open Recruitment — BEM UB 2026", category: "Organisasi", organization: "BEM Universitas Brawijaya",
    description: "Saatnya bawa ide dan energimu untuk Brawijaya. Pendaftaran terbuka untuk mahasiswa aktif semua fakultas. Kenali departemen, program kerja, dan alur seleksi melalui laman resmi BEM UB.",
    date: "30 Sep 2026", deadline: "12 Okt 2026", location: "Gedung Samantha Krida", image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85", color: "pink", tag: "Rekrutmen",
  },
  {
    id: "3", title: "UB Career Talk: Karier di Era AI", category: "Acara", organization: "Career Development Center UB",
    description: "Ngobrol bareng praktisi teknologi tentang skill yang dicari industri, membangun portofolio, dan menavigasi karier di tengah perkembangan AI. Terbuka untuk seluruh mahasiswa UB.",
    date: "08 Okt 2026", deadline: "07 Okt 2026", location: "Zoom Webinar · 13.00 WIB", image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=900&q=85", color: "blue", tag: "Webinar",
  },
  {
    id: "4", title: "Gemastik XIX — Saatnya Unjuk Karya", category: "Kompetisi", organization: "Pusat Prestasi Nasional",
    description: "Kompetisi nasional bidang TIK untuk mahasiswa. Bentuk tim, pilih cabang lomba, dan siapkan inovasi terbaikmu. Jadwal seleksi dan panduan teknis tersedia di kanal resmi Gemastik.",
    date: "28 Sep 2026", deadline: "18 Okt 2026", location: "Kompetisi nasional", image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85", color: "orange", tag: "Kompetisi nasional",
  },
  {
    id: "5", title: "Beasiswa Unggulan Kemendikbudristek", category: "Beasiswa", organization: "Kemendikbudristek",
    description: "Dukungan biaya pendidikan bagi putra-putri terbaik bangsa. Siapkan dokumen akademik, esai kontribusi, dan surat rekomendasi sebelum mengisi pendaftaran.",
    date: "26 Sep 2026", deadline: "15 Okt 2026", location: "Pendaftaran online", image: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=900&q=85", color: "yellow", tag: "S1 · S2 · S3",
  },
  {
    id: "6", title: "Penerimaan Anggota Baru — UB Radio", category: "Organisasi", organization: "UB Radio 104.4 FM",
    description: "Punya suara, cerita, atau rasa ingin tahu yang besar? UB Radio membuka pintu untuk penyiar, reporter, produser, dan tim kreatif. Temukan ruangmu di balik siaran.",
    date: "25 Sep 2026", deadline: "10 Okt 2026", location: "Studio UB Radio", image: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=900&q=85", color: "violet", tag: "UKM · Media",
  },
  {
    id: "9", title: "Open House Organisasi Ekstra Kampus", category: "Organisasi", organization: "Ruang diskusi mahasiswa",
    description: "Kenali ragam organisasi ekstra kampus, ruang diskusinya, dan kegiatan sosialnya. Sesi ini contoh konten demonstrasi; cek kanal organisasi terkait untuk jadwal dan pendaftaran yang sebenarnya.",
    date: "30 Sep 2026", deadline: "14 Okt 2026", location: "Area kampus UB", image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85", color: "pink", tag: "ORMEK",
  },
  {
    id: "7", title: "Brawijaya Innovation Week 2026", category: "Kompetisi", organization: "UB Innovation Center",
    description: "Pamerkan solusi inovatifmu di bidang pangan, kesehatan, energi, dan teknologi digital. Ada mentoring, jejaring industri, serta total hadiah puluhan juta rupiah.",
    date: "24 Sep 2026", deadline: "25 Okt 2026", location: "Gor Pertamina UB", image: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&w=900&q=85", color: "green", tag: "Call for ideas",
  },
  {
    id: "8", title: "Perubahan Jadwal Layanan Akademik", category: "Pengumuman", organization: "Direktorat Administrasi Akademik",
    description: "Layanan administrasi akademik pada Jumat, 9 Oktober 2026 akan tutup pukul 11.00 WIB karena kegiatan internal. Layanan kembali normal pada hari kerja berikutnya.",
    date: "01 Okt 2026", location: "Seluruh fakultas", image: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=900&q=85", color: "red", tag: "Info kampus",
  },
];

const categories: { label: string; icon: typeof LayoutGrid }[] = [
  { label: "Semua info", icon: LayoutGrid },
  { label: "Beasiswa", icon: GraduationCap },
  { label: "Organisasi", icon: UsersRound },
  { label: "Acara", icon: CalendarDays },
  { label: "Kompetisi", icon: Trophy },
  { label: "Pengumuman", icon: Megaphone },
];

const categoryClass: Record<Category, string> = {
  Beasiswa: "cat-scholarship", Organisasi: "cat-organization", Acara: "cat-event", Kompetisi: "cat-competition", Pengumuman: "cat-announcement",
};

export default function Home() {
  const [posts, setPosts] = useState(initialPosts);
  const [activeCategory, setActiveCategory] = useState("Semua info");
  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [sortNewest, setSortNewest] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/posts`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: Post[]) => { if (data.length) setPosts(data); })
      .catch(() => undefined);
  }, []);

  const visiblePosts = (sortNewest ? posts : [...posts].reverse())
    .filter((post) => activeCategory === "Semua info" || post.category === activeCategory)
    .filter((post) => !showSaved || saved.includes(post.id))
    .filter((post) => `${post.title} ${post.organization} ${post.description}`.toLowerCase().includes(search.toLowerCase()));

  const toggleSaved = (id: string) => setSaved((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <button className="mobile-menu icon-button" aria-label="Buka navigasi" onClick={() => setMobileNav(!mobileNav)}><Menu size={20} /></button>
        <a className="brand" href="#top" aria-label="PapanUB beranda"><span className="brand-mark"><span /></span><span>PAPAN<span className="brand-ub">UB</span></span></a>
        <div className="topbar-note"><span className="live-dot" /> Ruang informasi mahasiswa Brawijaya</div>
        <div className="topbar-actions">
          <button className={`icon-button saved-toggle ${showSaved ? "is-active" : ""}`} aria-label="Lihat info tersimpan" title="Tersimpan" onClick={() => setShowSaved(!showSaved)}><Bookmark size={19} fill={showSaved ? "currentColor" : "none"} /><span className="saved-count">{saved.length}</span></button>
          <button className="submit-button" onClick={() => setSelectedPost({ ...initialPosts[7], title: "Bagikan info ke PapanUB", description: "Fitur pengiriman informasi sedang disiapkan. Konten PapanUB saat ini merupakan demonstrasi; pastikan informasi dan tautan pendaftaran selalu dicek lewat kanal resmi.", organization: "Kontribusi mahasiswa", tag: "Kirim info" })}>Bagikan info <ArrowUpRight size={16} /></button>
        </div>
      </header>

      <div className="layout" id="top">
        <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
          <div className="campus-card">
            <div className="campus-seal"><span>UB</span><i /></div>
            <div><div className="campus-overline">UNIVERSITAS</div><strong>Brawijaya</strong><small>Malang · Indonesia</small></div>
          </div>
          <div className="side-label">JELAJAHI</div>
          <nav className="side-nav" aria-label="Kategori informasi">
            {categories.map(({ label, icon: Icon }) => <button key={label} className={`nav-link ${activeCategory === label ? "nav-active" : ""}`} onClick={() => { setActiveCategory(label); setShowSaved(false); setMobileNav(false); }}><Icon size={18} strokeWidth={2.2} /><span>{label}</span>{label === "Semua info" && <span className="nav-count">{posts.length}</span>}</button>)}
          </nav>
          <div className="side-rule" />
          <button className={`nav-link saved-nav ${showSaved ? "nav-active" : ""}`} onClick={() => { setShowSaved(!showSaved); setMobileNav(false); }}><Bookmark size={18} /><span>Disimpan</span>{saved.length > 0 && <span className="nav-count">{saved.length}</span>}</button>
          <div className="sidebar-bottom">
            <div className="tip-card"><div className="tip-icon"><Sparkles size={16} /></div><p>Selalu cek tanggal dan syarat di sumber resmi, ya.</p><span>BIAR NGGAK KELEWAT!</span></div>
            <div className="side-footer"><span>Independent student bulletin</span><span className="footer-mark">UB.</span></div>
          </div>
        </aside>

        {mobileNav && <button className="nav-scrim" aria-label="Tutup navigasi" onClick={() => setMobileNav(false)} />}

        <section className="content-area">
          <div className="welcome-strip"><span><span className="welcome-star">✳</span> KABAR BAIK, ANAK UB!</span><span className="strip-right">SEMESTER GANJIL 2026/2027 <span className="strip-square" /></span></div>
          <section className="hero-block">
            <div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> PAPAN INFORMASI KAMPUS</div><h1>Yang penting<br />jangan <span>terlewat.</span></h1><p>Beasiswa, komunitas, acara, sampai kabar kampus. Semua yang mahasiswa UB perlu tahu, ada di sini.</p></div>
            <div className="hero-art" aria-label="Ilustrasi papan pengumuman mahasiswa"><div className="art-sun" /><div className="art-paper paper-one"><span>IDE BESAR</span><b>!</b></div><div className="art-paper paper-two"><span>YOUR NEXT</span><strong>MOVE</strong><i /></div><div className="art-sticker">INFO<br />BARU <ArrowDownWideNarrow size={15} /></div><div className="art-caption">MALANG<br />7°57&apos; LS</div><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /></div>
          </section>

          <section className="urgent-bar"><div className="urgent-icon"><Bell size={18} fill="currentColor" /></div><div className="urgent-copy"><strong>JANGAN SAMPAI LEWAT</strong><span>Beasiswa Djarum Plus · Pendaftaran ditutup 20 November</span></div><button onClick={() => setSelectedPost(posts.find((post) => post.id === "1") || initialPosts[0])}>CEK INFO <ArrowUpRight size={15} /></button></section>

          <div className="feed-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> UPDATE TERBARU</div><h2>{showSaved ? "Info tersimpan" : activeCategory === "Semua info" ? "Papan hari ini" : activeCategory}</h2></div><div className="feed-meta"><span className="feed-live"><i /> LIVE BOARD</span><span className="meta-divider" />{visiblePosts.length} informasi</div></div>

          <section className="filter-row" aria-label="Pencarian dan pengurutan">
            <label className="search-box"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari beasiswa, acara, organisasi..." /><kbd>⌘ K</kbd></label>
            <button className="sort-button" onClick={() => setSortNewest(!sortNewest)}><ArrowDownWideNarrow size={17} /><span>{sortNewest ? "Terbaru" : "Terlama"}</span></button>
          </section>

          <div className="mobile-categories">{categories.map(({ label }) => <button key={label} className={activeCategory === label ? "chip-active" : ""} onClick={() => { setActiveCategory(label); setShowSaved(false); }}>{label}</button>)}</div>

          <section className="post-grid" aria-live="polite">
            {visiblePosts.map((post, index) => <article key={post.id} className={`post-card ${index === 0 && activeCategory === "Semua info" && !showSaved ? "post-featured" : ""}`}>
              <button className="post-image" onClick={() => setSelectedPost(post)} aria-label={`Buka ${post.title}`} style={{ backgroundImage: `url('${post.image}')` }}><span className={`post-tag ${categoryClass[post.category]}`}>{post.category}</span><span className="image-index">{String(index + 1).padStart(2, "0")}</span></button>
              <div className="post-body"><div className="post-org">{post.organization}</div><button className="post-title" onClick={() => setSelectedPost(post)}>{post.title}</button><p className="post-description">{post.description}</p><div className="post-footer"><span className="post-date"><Clock3 size={14} />{post.deadline ? `Tutup ${post.deadline}` : post.date}</span><button className={`bookmark-button ${saved.includes(post.id) ? "bookmarked" : ""}`} aria-label={saved.includes(post.id) ? "Hapus dari simpan" : "Simpan info"} title={saved.includes(post.id) ? "Hapus dari simpan" : "Simpan info"} onClick={() => toggleSaved(post.id)}>{saved.includes(post.id) ? <Check size={17} /> : <Bookmark size={17} />}</button></div></div>
            </article>)}
            {visiblePosts.length === 0 && <div className="empty-state"><CircleHelp size={27} /><h3>Belum ada info di sini.</h3><p>Coba kata kunci lain atau pilih kategori berbeda.</p><button onClick={() => { setSearch(""); setShowSaved(false); setActiveCategory("Semua info"); }}>Lihat semua informasi</button></div>}
          </section>

          <footer className="page-footer"><span>Data demonstrasi · verifikasi kanal resmi penyelenggara.</span><span>PAPANUB · 2026 <span className="footer-spark">✳</span></span></footer>
        </section>

        <aside className="right-rail">
          <div className="rail-date"><CalendarDays size={16} /><span>KALENDER KAMPUS</span><button aria-label="Lihat kalender"><ChevronRight size={17} /></button></div>
          <div className="calendar-date"><strong>OKT</strong><span>01</span><small>KAMIS</small></div>
          <div className="rail-section"><div className="rail-title"><span>SEGERA TUTUP</span><span className="rail-count">03</span></div>
            {[posts[1], posts[5], posts[4]].map((post, index) => <button key={post.id} className="deadline-item" onClick={() => setSelectedPost(post)}><span className={`deadline-num deadline-${index}`}>0{index + 1}</span><span className="deadline-info"><strong>{post.title}</strong><small>{post.deadline} · {post.category}</small></span><ArrowUpRight size={15} /></button>)}
          </div>
          <div className="rail-promo"><div className="promo-stars">✳ ✳ ✳</div><span>MASUK KAMPUS<br />JANGAN CUMA<br /><b>JADI PENONTON.</b></span><div className="promo-bottom"><span>Gerak, tumbuh, berdampak.</span><UsersRound size={19} /></div></div>
          <div className="rail-links"><button><CircleHelp size={15} /> Tentang PapanUB <ArrowUpRight size={13} /></button><button><Megaphone size={15} /> Hubungi redaksi <ArrowUpRight size={13} /></button></div>
        </aside>
      </div>

      {selectedPost && (
        <div className="modal-backdrop" role="presentation" onClick={() => setSelectedPost(null)}>
          <section className="detail-modal" role="dialog" aria-modal="true" aria-labelledby="detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="modal-image" style={{ backgroundImage: `url('${selectedPost.image}')` }}>
              <button className="modal-close" aria-label="Tutup detail" onClick={() => setSelectedPost(null)}><X size={20} /></button>
              <span className={`post-tag ${categoryClass[selectedPost.category]}`}>{selectedPost.category}</span>
            </div>
            <div className="modal-content">
              <div className="post-org">{selectedPost.organization}</div>
              <h2 id="detail-title">{selectedPost.title}</h2>
              <p>{selectedPost.description}</p>
              <div className="detail-facts">
                {selectedPost.deadline && <div><Clock3 size={16} /><span><small>BATAS PENDAFTARAN</small>{selectedPost.deadline}</span></div>}
                {selectedPost.location && <div><CalendarDays size={16} /><span><small>LOKASI / FORMAT</small>{selectedPost.location}</span></div>}
              </div>
              <div className="modal-actions">
                <button className={`modal-save ${saved.includes(selectedPost.id) ? "bookmarked" : ""}`} onClick={() => toggleSaved(selectedPost.id)}>
                  {saved.includes(selectedPost.id) ? <Check size={17} /> : <Bookmark size={17} />}{saved.includes(selectedPost.id) ? "Tersimpan" : "Simpan info"}
                </button>
                {selectedPost.sourceUrl ? <a className="modal-apply" href={selectedPost.sourceUrl} target="_blank" rel="noreferrer">Buka sumber resmi <ArrowUpRight size={16} /></a> : <button className="modal-apply" onClick={() => setSelectedPost(null)}>Tutup detail <X size={16} /></button>}
              </div>
              <div className="source-note">Pastikan detail dan persyaratan selalu dikonfirmasi melalui kanal resmi penyelenggara.</div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
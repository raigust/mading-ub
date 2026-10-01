"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiBaseUrl } from "@/utils/api";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Edit3,
  ExternalLink,
  FilePlus2,
  Filter,
  GraduationCap,
  LayoutDashboard,
  LayoutGrid,
  List,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Trophy,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import "./admin.css";

type Category = "Beasiswa" | "Organisasi" | "Acara" | "Kompetisi" | "Pengumuman";
type Post = {
  id: string;
  title: string;
  category: Category;
  organization: string;
  description: string;
  date: string;
  deadline: string | null;
  location: string | null;
  sourceUrl: string | null;
  image: string;
  color: string;
  tag: string;
  featured: boolean;
  createdAt: string;
};
type Draft = Omit<Post, "id" | "createdAt">;

const apiUrl = getApiBaseUrl();
const categoryItems: { label: Category; icon: typeof GraduationCap; tone: string }[] = [
  { label: "Beasiswa", icon: GraduationCap, tone: "lime" },
  { label: "Organisasi", icon: UsersRound, tone: "pink" },
  { label: "Acara", icon: CalendarDays, tone: "blue" },
  { label: "Kompetisi", icon: Trophy, tone: "orange" },
  { label: "Pengumuman", icon: Megaphone, tone: "violet" },
];
const emptyDraft: Draft = {
  title: "", category: "Beasiswa", organization: "", description: "", date: "2026-10-01", deadline: "", location: "", sourceUrl: "",
  image: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=85", color: "lime", tag: "Pendaftaran dibuka", featured: false,
};
const monthIndex: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", Mei: "05", Jun: "06", Jul: "07", Agu: "08", Sep: "09", Okt: "10", Nov: "11", Des: "12" };

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})\s+(\S{3})\s+(\d{4})$/);
  return match ? `${match[3]}-${monthIndex[match[2]] || "01"}-${match[1].padStart(2, "0")}` : "";
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Belum ditentukan";
  const date = toDateInput(value);
  return date ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${date}T00:00:00`)) : value;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("admin");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Semua kategori");
  const [sortNewest, setSortNewest] = useState(true);
  const [viewMode, setViewMode] = useState<"bento" | "table">("bento");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      if (apiUrl === null) {
        setNotice({ kind: "error", text: "Backend API belum dideploy. Mading publik dapat dilihat, tetapi pengelolaan admin belum tersedia." });
        setLoading(false);
        return;
      }
      try {
        const sessionResponse = await fetch(`${apiUrl}/api/admin/session`, { credentials: "include" });
        if (!sessionResponse.ok) {
          router.replace("/admin/login");
          return;
        }
        const session = await sessionResponse.json();
        const postsResponse = await fetch(`${apiUrl}/api/admin/posts`, { credentials: "include" });
        if (!postsResponse.ok) throw new Error("Gagal memuat daftar informasi.");
        const data: Post[] = await postsResponse.json();
        if (active) {
          setUsername(session.username);
          setPosts(data);
        }
      } catch {
        if (active) setNotice({ kind: "error", text: "API belum dapat dihubungi. Pastikan server berjalan." });
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { active = false; };
  }, [router]);

  const visiblePosts = posts
    .filter((post) => category === "Semua kategori" || post.category === category)
    .filter((post) => `${post.title} ${post.organization} ${post.description}`.toLocaleLowerCase("id").includes(query.toLocaleLowerCase("id")))
    .sort((a, b) => sortNewest ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt));

  function openCreate() {
    setEditingId(null);
    setDraft({ ...emptyDraft });
    setEditorOpen(true);
  }

  function openEdit(post: Post) {
    setEditingId(post.id);
    setDraft({
      title: post.title, category: post.category, organization: post.organization, description: post.description,
      date: toDateInput(post.date), deadline: toDateInput(post.deadline), location: post.location || "", sourceUrl: post.sourceUrl || "", image: post.image,
      color: post.color, tag: post.tag, featured: post.featured,
    });
    setEditorOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`${apiUrl}/api/admin/posts${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, deadline: draft.deadline || null, location: draft.location || null, sourceUrl: draft.sourceUrl || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan informasi.");
      setPosts((current) => editingId ? current.map((post) => post.id === editingId ? data : post) : [data, ...current]);
      setEditorOpen(false);
      setNotice({ kind: "success", text: editingId ? "Informasi berhasil diperbarui." : "Informasi baru berhasil diterbitkan." });
    } catch (saveError) {
      setNotice({ kind: "error", text: saveError instanceof Error ? saveError.message : "Gagal menyimpan informasi." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: Post) {
    if (!window.confirm(`Hapus “${post.title}” dari mading?`)) return;
    try {
      const response = await fetch(`${apiUrl}/api/admin/posts/${post.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Gagal menghapus informasi.");
      }
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setNotice({ kind: "success", text: "Informasi berhasil dihapus." });
    } catch (deleteError) {
      setNotice({ kind: "error", text: deleteError instanceof Error ? deleteError.message : "Gagal menghapus informasi." });
    }
  }

  async function handleLogout() {
    await fetch(`${apiUrl}/api/admin/logout`, { method: "POST", credentials: "include" });
    router.replace("/admin/login");
  }

  // Class generator untuk pola Bento Grid di Admin
  const getBentoSpan = (index: number) => {
    const pattern = index % 5;
    switch (pattern) {
      case 0:
        return "col-span-12 lg:col-span-8 row-span-2";
      case 1:
        return "col-span-12 lg:col-span-4 row-span-2";
      case 2:
        return "col-span-12 lg:col-span-4 row-span-1";
      case 3:
        return "col-span-12 lg:col-span-4 row-span-1";
      case 4:
        return "col-span-12 lg:col-span-4 row-span-1";
      default:
        return "col-span-12 lg:col-span-4 row-span-1";
    }
  };

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-wordmark">PAPAN<span>UB</span><i>CONTROL ROOM</i></a>
        <div className="admin-campus"><div className="admin-seal">UB</div><div><strong>Universitas Brawijaya</strong><small>ADMIN CONSOLE · 2026</small></div></div>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav"><a className="admin-nav-active" href="/admin"><LayoutDashboard size={17} /> Ringkasan</a><a href="#content"><BookOpenText size={17} /> Semua informasi<span>{posts.length}</span></a><a href="/admin/profile"><UserRound size={17} /> Profil admin</a></nav>
        <div className="admin-sidebar-bottom"><div className="secure-panel"><ShieldCheck size={18} /><div><strong>Akses superadmin</strong><span>Sesi privat · 8 jam</span></div><span className="secure-dot" /></div><button className="admin-logout" disabled={apiUrl === null} onClick={handleLogout}><LogOut size={17} /> Keluar dari akun</button><a href="/" className="back-board"><ArrowLeft size={15} /> Kembali ke mading</a></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div className="breadcrumb">PAPANUB <span>/</span> <strong>CONTROL ROOM</strong></div><div className="admin-user"><span className="admin-avatar">{username.slice(0, 1).toUpperCase()}</span><span><strong>{username}</strong><small>Superadmin</small></span><ShieldCheck size={17} /></div></header>
        <div className="admin-content">
          <div className="admin-welcome"><div><div className="admin-kicker"><span className="welcome-live" /> DASHBOARD PENGELOLA</div><h1>Selamat datang, <span>{username}.</span></h1><p>Satu tempat untuk mengatur semua kabar di papan informasi Brawijaya.</p></div><div className="admin-welcome-actions"><a className="preview-board" href="/" target="_blank" rel="noreferrer"><ExternalLink size={16} /> Lihat mading</a><button className="create-post-button" disabled={apiUrl === null} onClick={openCreate}><FilePlus2 size={17} /> Buat informasi</button></div></div>

          {notice && <div className={`admin-notice notice-${notice.kind}`} role="status"><span>{notice.kind === "success" ? <Check size={17} /> : <CircleAlert size={17} />}{notice.text}</span><button aria-label="Tutup pesan" onClick={() => setNotice(null)}><X size={16} /></button></div>}

          {/* BENTO STATS SECTION */}
          <section className="admin-stats grid grid-cols-12 gap-4 mb-8" aria-label="Ringkasan konten">
            <div className="admin-stat stat-total col-span-12 sm:col-span-6 lg:col-span-4 border-3 border-black bg-yellow-300 p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="stat-icon mb-2 inline-block"><BookOpenText size={22} /></span>
              <span className="stat-label block text-xs font-black uppercase tracking-wider">TOTAL INFORMASI</span>
              <strong className="text-4xl font-black block my-1">{posts.length.toString().padStart(2, "0")}</strong>
              <small className="font-bold text-xs">Konten aktif di papan</small>
            </div>
            {categoryItems.map(({ label, icon: Icon, tone }) => (
              <div key={label} className={`admin-stat stat-${tone} col-span-6 sm:col-span-3 lg:col-span-2 border-3 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between`}>
                <span className="stat-icon"><Icon size={20} /></span>
                <div>
                  <span className="stat-label block text-[10px] font-black uppercase tracking-wider text-black/70 mt-2">{label.toUpperCase()}</span>
                  <strong className="text-2xl font-black block">{posts.filter((post) => post.category === label).length.toString().padStart(2, "0")}</strong>
                </div>
              </div>
            ))}
          </section>

          <section className="content-manager" id="content">
            <div className="manager-heading flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <div className="admin-kicker"><span className="heading-dash" /> PENGELOLAAN KONTEN</div>
                <h2>Semua informasi <span>{posts.length}</span></h2>
                <p>Kelola isi mading, tenggat, kategori, dan penayangan unggulan.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="view-toggle border-2 border-black bg-white flex p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <button className={`p-1.5 ${viewMode === "bento" ? "bg-black text-white" : "text-black"}`} onClick={() => setViewMode("bento")} title="Bento Grid View"><LayoutGrid size={16} /></button>
                  <button className={`p-1.5 ${viewMode === "table" ? "bg-black text-white" : "text-black"}`} onClick={() => setViewMode("table")} title="Table View"><List size={16} /></button>
                </div>
                <button className="manager-add" disabled={apiUrl === null} onClick={openCreate}><FilePlus2 size={16} /> Tambah konten</button>
              </div>
            </div>

            <div className="manager-toolbar flex flex-wrap gap-3 mb-6">
              <label className="admin-search flex-1"><Search size={17} /><input placeholder="Cari judul, organisasi, atau isi..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>/</kbd></label>
              <label className="category-filter"><Filter size={16} /><select value={category} onChange={(event) => setCategory(event.target.value)}><option>Semua kategori</option>{categoryItems.map(({ label }) => <option key={label}>{label}</option>)}</select><ChevronDown size={14} /></label>
              <button className="order-button" onClick={() => setSortNewest(!sortNewest)}><ArrowDownUp size={16} /> {sortNewest ? "Terbaru" : "Terlama"}</button>
            </div>

            {/* BENTO GRID VIEW / TABLE VIEW TOGGLE */}
            {viewMode === "bento" ? (
              <div className="admin-bento-grid grid grid-cols-12 gap-5 auto-rows-[220px]">
                {loading ? (
                  <div className="col-span-12 p-12 text-center font-black border-3 border-black bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    Memuat data mading...
                  </div>
                ) : (
                  visiblePosts.map((post, index) => {
                    const spanClass = getBentoSpan(index);
                    const tone = categoryItems.find((item) => item.label === post.category)?.tone || "lime";
                    return (
                      <article key={post.id} className={`admin-bento-card ${spanClass} border-3 border-black bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] flex flex-col justify-between overflow-hidden relative group hover:-translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all`}>
                        <div className="bento-card-header flex items-center justify-between p-3 border-b-2 border-black bg-stone-100">
                          <span className={`admin-category admin-${tone} text-xs font-black border-2 border-black px-2 py-0.5 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]`}>
                            {post.category}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className={`publish-status text-xs font-bold ${post.featured ? "status-featured" : ""}`}>
                              {post.featured ? "★ Unggulan" : "Tayang"}
                            </span>
                            <button className="p-1 border-2 border-black bg-white hover:bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Edit" onClick={() => openEdit(post)}>
                              <Edit3 size={14} />
                            </button>
                            <button className="p-1 border-2 border-black bg-red-400 text-white hover:bg-red-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" title="Hapus" onClick={() => void handleDelete(post)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="bento-card-body p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-[11px] font-black uppercase text-black/60 mb-1">{post.organization}</div>
                            <h3 className="font-black text-base line-clamp-2 leading-snug">{post.title}</h3>
                            <p className="text-xs text-black/80 mt-1 line-clamp-2 font-medium">{post.description}</p>
                          </div>
                          
                          <div className="bento-card-footer pt-3 mt-2 border-t-2 border-black/10 flex items-center justify-between text-xs font-bold text-black/70">
                            <span className="flex items-center gap-1"><Clock3 size={13} /> {displayDate(post.deadline)}</span>
                            <span className="text-[10px] uppercase font-black tracking-wider text-black/50">Diperbarui {displayDate(post.date)}</span>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
                {!loading && visiblePosts.length === 0 && (
                  <div className="col-span-12 p-12 text-center font-black border-3 border-black bg-white shadow-[5px_5px_0px_0px_rgba(0,0,0,1)]">
                    Tidak ada informasi yang cocok dengan pencarian ini.
                  </div>
                )}
              </div>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>INFORMASI</th>
                      <th>KATEGORI</th>
                      <th>TENGGAT</th>
                      <th>STATUS</th>
                      <th><span className="sr-only">Aksi</span><MoreHorizontal size={17} /></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td className="table-state" colSpan={5}>Memuat data mading...</td></tr>
                    ) : (
                      visiblePosts.map((post) => (
                        <tr key={post.id}>
                          <td>
                            <div className="table-title-cell">
                              <div className="table-thumb" style={{ backgroundImage: `url('${post.image}')` }} />
                              <div>
                                <strong>{post.title}</strong>
                                <small>{post.organization}<span>·</span> Diperbarui {displayDate(post.date)}</small>
                              </div>
                            </div>
                          </td>
                          <td><span className={`admin-category admin-${categoryItems.find((item) => item.label === post.category)?.tone || "lime"}`}>{post.category}</span></td>
                          <td><span className="deadline-cell"><Clock3 size={14} />{displayDate(post.deadline)}</span></td>
                          <td><span className={`publish-status ${post.featured ? "status-featured" : ""}`}><i />{post.featured ? "Unggulan" : "Tayang"}</span></td>
                          <td>
                            <div className="row-actions">
                              <button title="Edit informasi" aria-label={`Edit ${post.title}`} onClick={() => openEdit(post)}><Edit3 size={16} /></button>
                              <button className="delete-action" title="Hapus informasi" aria-label={`Hapus ${post.title}`} onClick={() => void handleDelete(post)}><Trash2 size={16} /></button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                    {!loading && visiblePosts.length === 0 && <tr><td className="table-state" colSpan={5}>Tidak ada informasi yang cocok dengan pencarian ini.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            <div className="manager-foot mt-4"><span><span className="foot-status-dot" /> Database tersambung</span><span>Menampilkan {visiblePosts.length} dari {posts.length} konten <Sparkles size={14} /></span></div>
          </section>
          <footer className="admin-footer"><span>Jaga kabar kampus tetap akurat dan bermanfaat.</span><span>PAPANUB <b>·</b> SUPERADMIN</span></footer>
        </div>
      </section>

      {editorOpen && <div className="editor-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditorOpen(false); }}><section className="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editor-title"><header className="editor-header"><div><span className="admin-kicker">FORMULIR PUBLIKASI</span><h2 id="editor-title">{editingId ? "Edit informasi" : "Buat informasi baru"}</h2></div><button className="editor-close" aria-label="Tutup formulir" onClick={() => setEditorOpen(false)}><X size={19} /></button></header><form onSubmit={handleSave}><div className="editor-grid">
        <label className="field-wide">Judul informasi<input maxLength={180} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Contoh: Beasiswa prestasi UB 2026" required /></label>
        <label>Kategori<select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as Category })}>{categoryItems.map(({ label }) => <option key={label}>{label}</option>)}</select></label>
        <label>Label singkat<input maxLength={80} value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} placeholder="Pendaftaran dibuka" required /></label>
        <label className="field-wide">Penyelenggara<input maxLength={120} value={draft.organization} onChange={(event) => setDraft({ ...draft, organization: event.target.value })} placeholder="Nama organisasi / penyelenggara" required /></label>
        <label>Tanggal publikasi<input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} required /></label>
        <label>Batas pendaftaran<input type="date" value={draft.deadline || ""} onChange={(event) => setDraft({ ...draft, deadline: event.target.value })} /></label>
        <label className="field-wide">Lokasi / format<input maxLength={180} value={draft.location || ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} placeholder="Online, Gedung, atau lokasi acara" /></label>
        <label className="field-wide">Tautan sumber / pendaftaran<input type="url" maxLength={2000} value={draft.sourceUrl || ""} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} placeholder="https://kanal-resmi.id/pendaftaran" /></label>
        <label className="field-wide">URL gambar<input type="url" maxLength={2000} value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} placeholder="https://..." required /></label>
        <label className="field-wide">Deskripsi<textarea maxLength={5000} rows={4} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Ringkasan yang jelas, syarat penting, dan cara mendaftar..." required /></label>
        <label>Warna label<select value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })}>{["lime", "pink", "blue", "orange", "violet", "green", "yellow", "red"].map((color) => <option key={color}>{color}</option>)}</select></label>
        <label className="featured-toggle"><input type="checkbox" checked={draft.featured} onChange={(event) => setDraft({ ...draft, featured: event.target.checked })} /><span className="custom-check"><Check size={13} /></span><span><strong>Jadikan unggulan</strong><small>Prioritaskan di mading publik</small></span></label>
      </div><footer className="editor-actions"><button type="button" className="cancel-editor" onClick={() => setEditorOpen(false)}>Batal</button><button type="submit" className="save-editor" disabled={saving}>{saving ? "Menyimpan..." : editingId ? "Simpan perubahan" : "Terbitkan info"}<ArrowUpRight size={16} /></button></footer></form></section></div>}
    </main>
  );
}
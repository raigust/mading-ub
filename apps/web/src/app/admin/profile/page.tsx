"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, BadgeCheck, KeyRound, LockKeyhole, Save, ShieldCheck, UserRound, AtSign } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import "../admin.css";

type Profile = { id: string; username: string; displayName: string; email: string };
const apiUrl = getApiBaseUrl();

export default function AdminProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ id: "", username: "", displayName: "", email: "" });
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (!apiUrl) {
      setNotice({ kind: "error", text: "Backend API belum dideploy. Profil admin tersedia setelah NEXT_PUBLIC_API_URL diatur." });
      setLoading(false);
      return () => { active = false; };
    }
    fetch(`${apiUrl}/api/admin/profile`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) {
          router.replace("/admin/login");
          return null;
        }
        if (!response.ok) throw new Error("Gagal memuat profil admin.");
        return response.json() as Promise<Profile>;
      })
      .then((data) => { if (active && data) setProfile(data); })
      .catch((error: unknown) => { if (active) setNotice({ kind: "error", text: error instanceof Error ? error.message : "API belum dapat dihubungi." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!apiUrl) {
      setNotice({ kind: "error", text: "Backend API belum dikonfigurasi." });
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setNotice({ kind: "error", text: "Konfirmasi password baru belum sama." });
      return;
    }
    if (newPassword && newPassword.length < 12) {
      setNotice({ kind: "error", text: "Gunakan password baru minimal 12 karakter." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/api/admin/profile`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile, currentPassword, ...(newPassword ? { newPassword } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan profil.");
      setProfile(data);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice({ kind: "success", text: "Profil tersimpan. Sesi lain sudah dicabut; sesi ini diperbarui." });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Gagal memperbarui profil." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <a href="/" className="admin-wordmark">PAPAN<span>UB</span><i>CONTROL ROOM</i></a>
        <div className="admin-campus"><div className="admin-seal">UB</div><div><strong>Universitas Brawijaya</strong><small>ADMIN CONSOLE · 2026</small></div></div>
        <div className="admin-nav-label">WORKSPACE</div>
        <nav className="admin-nav"><a href="/admin"><ArrowLeft size={17} /> Kembali ke dashboard</a><a className="admin-nav-active" href="/admin/profile"><UserRound size={17} /> Profil admin</a></nav>
        <div className="admin-sidebar-bottom"><div className="secure-panel"><ShieldCheck size={18} /><div><strong>Profil terlindungi</strong><span>Password tidak pernah ditampilkan</span></div><span className="secure-dot" /></div><a href="/admin" className="back-board"><ArrowLeft size={15} /> Kembali ke dashboard</a></div>
      </aside>

      <section className="admin-workspace">
        <header className="admin-topbar"><div className="breadcrumb">PAPANUB <span>/</span> <strong>PROFIL ADMIN</strong></div><a className="profile-dashboard-link" href="/admin"><ArrowLeft size={15} /> Dashboard</a></header>
        <div className="admin-content profile-content">
          <div className="admin-welcome"><div><div className="admin-kicker"><span className="welcome-live" /> AKUN SUPERADMIN</div><h1>Pengaturan <span>profil.</span></h1><p>Perbarui identitas dan keamanan akun pengelola mading.</p></div></div>
          {notice && <div className={`admin-notice notice-${notice.kind}`} role="status"><span>{notice.kind === "success" ? <BadgeCheck size={17} /> : <KeyRound size={17} />}{notice.text}</span></div>}
          <div className="profile-layout">
            <section className="profile-card">
              <header className="profile-card-head"><div className="profile-avatar-large">{profile.displayName.slice(0, 1).toUpperCase() || "A"}</div><div><span className="admin-kicker">SUPERADMIN PAPANUB</span><h2>{profile.displayName || (loading ? "Memuat profil..." : "Administrator")}</h2><p>{profile.email}</p></div></header>
              <form className="profile-form" onSubmit={handleSubmit}>
                <div className="profile-section-label"><UserRound size={16} /><span>IDENTITAS ADMIN</span></div>
                <div className="profile-fields">
                  <label>Nama tampilan<span className="profile-input"><UserRound size={16} /><input maxLength={120} value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} placeholder="Nama admin" required disabled={loading || !apiUrl} /></span></label>
                  <label>Username<span className="profile-input"><AtSign size={16} /><input maxLength={120} value={profile.username} onChange={(event) => setProfile({ ...profile, username: event.target.value })} placeholder="username" required disabled={loading || !apiUrl} /></span></label>
                  <label className="profile-field-wide">Email admin<span className="profile-input"><AtSign size={16} /><input type="email" maxLength={254} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} placeholder="admin@kampus.ac.id" required disabled={loading || !apiUrl} /></span></label>
                </div>
                <div className="profile-section-label password-section"><LockKeyhole size={16} /><span>GANTI PASSWORD</span><small>OPSIONAL</small></div>
                <p className="password-guidance">Password baru minimal 12 karakter. Kosongkan jika tidak ingin menggantinya.</p>
                <div className="profile-fields">
                  <label>Password saat ini<span className="profile-input"><KeyRound size={16} /><input type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Wajib untuk menyimpan profil" required disabled={!apiUrl} /></span></label>
                  <label>Password baru<span className="profile-input"><KeyRound size={16} /><input type="password" autoComplete="new-password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Minimal 12 karakter" disabled={!apiUrl} /></span></label>
                  {newPassword && <label className="profile-field-wide">Ulangi password baru<span className="profile-input"><KeyRound size={16} /><input type="password" autoComplete="new-password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Masukkan ulang password baru" required disabled={!apiUrl} /></span></label>}
                </div>
                <footer className="profile-form-actions"><span><ShieldCheck size={15} /> Verifikasi password diperlukan untuk menyimpan</span><button type="submit" className="save-editor" disabled={saving || loading || !apiUrl}><Save size={16} />{saving ? "Menyimpan..." : "Simpan profil"}<ArrowRight size={15} /></button></footer>
              </form>
            </section>
            <aside className="profile-security-note"><div className="security-note-icon"><ShieldCheck size={19} /></div><div className="admin-kicker">KEAMANAN AKUN</div><h3>Akses tetap<br />di tanganmu.</h3><p>Setiap perubahan diverifikasi memakai password aktif. Password baru disimpan sebagai hash dan sesi admin lain akan otomatis kedaluwarsa.</p><div className="security-note-rule" /><span><BadgeCheck size={15} /> Password di-hash dengan bcrypt</span><span><BadgeCheck size={15} /> Sesi aktif diperbarui dengan aman</span><span><BadgeCheck size={15} /> Sesi perangkat lain dicabut</span></aside>
          </div>
        </div>
      </section>
    </main>
  );
}
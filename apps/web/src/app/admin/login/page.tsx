"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { getApiBaseUrl } from "@/utils/api";
import "../admin.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const apiUrl = getApiBaseUrl();
      if (apiUrl === null) throw new Error("Backend API belum dideploy. Login admin aktif setelah NEXT_PUBLIC_API_URL diatur.");
      const response = await fetch(`${apiUrl}/api/admin/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Tidak dapat masuk.");
      router.replace("/admin");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "API belum dapat dihubungi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="admin-login-shell">
      <section className="login-intro">
        <a className="admin-wordmark" href="/">PAPAN<span>UB</span><i>CONTROL ROOM</i></a>
        <div className="login-intro-copy">
          <span className="admin-kicker"><span /> RUANG REDAKSI DIGITAL</span>
          <h1>Semua kabar.<br /><span>Satu kendali.</span></h1>
          <p>Kelola informasi Brawijaya dengan rapi. Terbitkan kabar yang tepat, rapikan yang sudah lewat, dan jaga papan tetap hidup.</p>
          <div className="login-illustration" aria-hidden="true">
            <div className="login-sticker sticker-yellow">PAPAN<br />HARI INI</div>
            <div className="login-note"><span>UPDATE</span><strong>UB!</strong><i /></div>
            <div className="login-seal">✳</div>
            <div className="login-caption">MALANG · 2026</div>
          </div>
        </div>
        <span className="login-footnote">PAPANUB · ADMINISTRATOR AREA</span>
      </section>

      <section className="login-side">
        <a className="back-to-board" href="/"><ArrowLeft size={16} /> Kembali ke mading</a>
        <div className="login-form-wrap">
          <div className="login-icon"><ShieldCheck size={23} /></div>
          <div className="admin-kicker">AKSES TERBATAS</div>
          <h2>Masuk, Admin.</h2>
          <p className="login-lead">Gunakan akun superadmin untuk mengelola seluruh konten PapanUB.</p>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>Username<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label>Password<span className="password-field"><input autoComplete="current-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button className="login-submit" type="submit" disabled={loading}>{loading ? "Memeriksa akses..." : "Masuk ke dashboard"}{!loading && <ArrowRight size={17} />}</button>
          </form>
          {process.env.NODE_ENV === "development" && <div className="demo-account"><KeyRound size={16} /><div><strong>Akun demo superadmin</strong><span>Username: admin <b>·</b> Password: admin123</span></div></div>}
        </div>
        <span className="login-side-caption">AKSES DIBATASI UNTUK PENGELOLA PAPAN</span>
      </section>
    </main>
  );
}
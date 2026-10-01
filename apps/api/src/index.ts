import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const app = express();
const port = Number(process.env.PORT || 4000);
const bootstrapUsername = process.env.ADMIN_USERNAME || (process.env.NODE_ENV === "production" ? "" : "admin");
const bootstrapPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin123");
const sessionSecret = process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "papanub-local-development-session-secret");
const adminCookie = "papanub_admin";
const sessionTtlSeconds = 2 * 60 * 60;
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:3000").split(",").map((origin) => origin.trim());
const categories = ["Beasiswa", "Organisasi", "Acara", "Kompetisi", "Pengumuman"] as const;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase: SupabaseClient | null = supabaseUrl && supabaseSecretKey
  ? createClient(supabaseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, ""), supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

type AdminUserRow = {
  id: string;
  username: string;
  display_name: string;
  email: string;
  password_hash: string;
  session_version: number;
};

type PostRow = Omit<PostInput, "sourceUrl"> & {
  id: string;
  source_url: string | null;
  created_at: string;
  updated_at: string;
};

function getSupabase() {
  if (!supabase) throw new Error("Supabase backend credentials are missing. Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return supabase;
}

function toApiPost(row: PostRow) {
  const { source_url, created_at, updated_at, ...post } = row;
  return { ...post, sourceUrl: source_url, createdAt: created_at, updatedAt: updated_at };
}

function toDatabasePost(post: PostInput) {
  const { sourceUrl, ...fields } = post;
  return { ...fields, source_url: sourceUrl };
}

type PostInput = {
  title: string;
  category: typeof categories[number];
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
};

app.disable("x-powered-by");
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => response.json({ status: "ok", service: "papanub-api" }));

function createSessionToken(user: { id: string; sessionVersion: number }) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, ver: user.sessionVersion, exp: Math.floor(Date.now() / 1000) + sessionTtlSeconds })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function setSessionCookie(response: Response, user: { id: string; sessionVersion: number }) {
  response.cookie(adminCookie, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: sessionTtlSeconds * 1000,
    path: "/",
  });
}

function readSession(request: Request) {
  const cookie = request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${adminCookie}=`));
  const token = cookie?.slice(adminCookie.length + 1);
  if (!token || !sessionSecret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", sessionSecret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; ver?: number; exp?: number };
    if (typeof data.sub !== "string" || typeof data.ver !== "number" || typeof data.exp !== "number" || data.exp <= Date.now() / 1000) return null;
    return { id: data.sub, sessionVersion: data.ver };
  } catch {
    return null;
  }
}

async function requireAdmin(request: Request, response: Response, next: NextFunction) {
  const session = readSession(request);
  if (!session) return response.status(401).json({ error: "Sesi admin tidak valid atau sudah berakhir." });
  try {
    const { data, error } = await getSupabase().from("admin_users").select("*").eq("id", session.id).maybeSingle();
    if (error) throw error;
    const user = data as AdminUserRow | null;
    if (!user || user.session_version !== session.sessionVersion) return response.status(401).json({ error: "Sesi admin sudah dicabut. Silakan masuk kembali." });
    response.locals.adminUser = user;
    return next();
  } catch {
    return response.status(503).json({ error: "Layanan autentikasi sedang tidak tersedia." });
  }
}

function requireTrustedOrigin(request: Request, response: Response, next: NextFunction) {
  const origin = request.get("origin");
  if ((origin && !allowedOrigins.includes(origin)) || (!origin && process.env.NODE_ENV === "production")) {
    return response.status(403).json({ error: "Asal permintaan tidak diizinkan." });
  }
  return next();
}

function validatePost(input: unknown): PostInput | null {
  if (!input || typeof input !== "object") return null;
  const data = input as Record<string, unknown>;
  const required = ["title", "organization", "description", "date", "image", "color", "tag"];
  if (required.some((key) => typeof data[key] !== "string" || !(data[key] as string).trim())) return null;
  if (typeof data.category !== "string" || !categories.includes(data.category as typeof categories[number])) return null;

  const text = (key: string, maximum: number) => (data[key] as string).trim().slice(0, maximum);
  const optionalText = (key: string, maximum: number) => typeof data[key] === "string" && data[key].trim() ? data[key].trim().slice(0, maximum) : null;
  return {
    title: text("title", 180),
    category: data.category as typeof categories[number],
    organization: text("organization", 120),
    description: text("description", 5000),
    date: text("date", 80),
    deadline: optionalText("deadline", 80),
    location: optionalText("location", 180),
    sourceUrl: optionalText("sourceUrl", 2000),
    image: text("image", 2000),
    color: text("color", 40),
    tag: text("tag", 80),
    featured: data.featured === true,
  };
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === "production" ? 5 : 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Terlalu banyak percobaan masuk. Coba lagi sebentar lagi." },
});
const distributedLoginLimiter = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(5, "15 m"), prefix: "papanub:admin:login" })
  : null;

async function enforceLoginLimit(request: Request, response: Response, next: NextFunction) {
  if (!distributedLoginLimiter) {
    if (process.env.NODE_ENV === "production") {
      return response.status(503).json({ error: "Login production belum dikonfigurasi: tambahkan URL dan token Upstash Redis." });
    }
    return loginLimiter(request, response, next);
  }
  try {
    const result = await distributedLoginLimiter.limit(request.ip || "unknown");
    response.setHeader("X-RateLimit-Limit", result.limit);
    response.setHeader("X-RateLimit-Remaining", result.remaining);
    response.setHeader("X-RateLimit-Reset", result.reset);
    if (!result.success) return response.status(429).json({ error: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit." });
    return next();
  } catch {
    return response.status(503).json({ error: "Layanan pembatasan login sedang tidak tersedia." });
  }
}

function publicAdminProfile(user: AdminUserRow) {
  return { id: user.id, username: user.username, displayName: user.display_name, email: user.email };
}

async function ensureBootstrapAdmin() {
  const client = getSupabase();
  const { data: existingData, error: existingError } = await client.from("admin_users").select("*").limit(1).maybeSingle();
  if (existingError) throw existingError;
  const existing = existingData as AdminUserRow | null;
  if (existing) return existing;
  if (!bootstrapUsername || !bootstrapPassword) return null;
  if (bootstrapPassword.length < 12 && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters for first-time production setup.");
  }
  const passwordHash = await hash(bootstrapPassword, 12);
  const { data, error } = await client.from("admin_users").insert({
    username: bootstrapUsername,
    display_name: process.env.ADMIN_DISPLAY_NAME || "Superadmin PapanUB",
    email: process.env.ADMIN_EMAIL || "admin@papanub.local",
    password_hash: passwordHash,
  }).select("*").single();
  if (error?.code === "23505") {
    const { data: racedUser, error: racedError } = await client.from("admin_users").select("*").eq("username", bootstrapUsername).single();
    if (racedError) throw racedError;
    return racedUser as AdminUserRow;
  }
  if (error) throw error;
  return data as AdminUserRow;
}

app.post("/api/admin/login", requireTrustedOrigin, (request, response, next) => {
  if (process.env.NODE_ENV === "production" && sessionSecret.length < 32) {
    return response.status(503).json({ error: "Login production belum dikonfigurasi: ADMIN_SESSION_SECRET harus minimal 32 karakter." });
  }
  if (!supabase) {
    return response.status(503).json({ error: "Backend belum terhubung: tambahkan SUPABASE_URL dan SUPABASE_SECRET_KEY." });
  }
  return next();
}, enforceLoginLimit, async (request, response) => {
  const username = typeof request.body?.username === "string" ? request.body.username.trim() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!username || !password || username.length > 120 || password.length > 256) {
    return response.status(400).json({ error: "Masukkan username dan password yang valid." });
  }

  try {
    const firstAdmin = await ensureBootstrapAdmin();
    if (!firstAdmin) return response.status(503).json({ error: "Admin belum dikonfigurasi. Atur kredensial bootstrap di environment backend." });
    const { data: userData, error } = await getSupabase().from("admin_users").select("*").eq("username", username).maybeSingle();
    if (error) throw error;
    const user = userData as AdminUserRow | null;
    const valid = await compare(password, user?.password_hash || "$2b$12$invalid.invalid.invalid.invalid.invalid.invalid.invalid.invalid");
    if (!user || !valid) return response.status(401).json({ error: "Username atau password tidak sesuai." });

    setSessionCookie(response, { id: user.id, sessionVersion: user.session_version });
    return response.json({ profile: publicAdminProfile(user), expiresIn: sessionTtlSeconds });
  } catch (error) {
    console.error("Admin login failed", error);
    return response.status(503).json({ error: "Login tidak dapat diproses saat ini." });
  }
});

app.get("/api/admin/session", requireAdmin, (_request, response) => response.json(publicAdminProfile(response.locals.adminUser)));

app.get("/api/admin/profile", requireAdmin, (_request, response) => response.json(publicAdminProfile(response.locals.adminUser)));

app.put("/api/admin/profile", requireTrustedOrigin, requireAdmin, async (request, response) => {
  const user = response.locals.adminUser as AdminUserRow;
  const { username, displayName, email, currentPassword, newPassword } = request.body || {};
  if ([username, displayName, email, currentPassword].some((value) => typeof value !== "string" || !value.trim())) {
    return response.status(400).json({ error: "Username, nama tampilan, email, dan password saat ini wajib diisi." });
  }
  if (username.trim().length > 120 || displayName.trim().length > 120 || email.trim().length > 254) {
    return response.status(400).json({ error: "Panjang salah satu field melewati batas." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return response.status(400).json({ error: "Format email tidak valid." });
  if (newPassword !== undefined && (typeof newPassword !== "string" || newPassword.length < 12 || newPassword.length > 256)) {
    return response.status(400).json({ error: "Password baru harus terdiri dari 12 sampai 256 karakter." });
  }

  if (!await compare(currentPassword, user.password_hash)) return response.status(401).json({ error: "Password saat ini tidak sesuai." });
  try {
    const { data, error } = await getSupabase().from("admin_users").update({
      username: username.trim(),
      display_name: displayName.trim(),
      email: email.trim().toLowerCase(),
      ...(newPassword ? { password_hash: await hash(newPassword, 12) } : {}),
      session_version: user.session_version + 1,
    }).eq("id", user.id).select("*").single();
    if (error?.code === "23505") return response.status(409).json({ error: "Username atau email sudah digunakan." });
    if (error) throw error;
    const updated = data as AdminUserRow;
    setSessionCookie(response, { id: updated.id, sessionVersion: updated.session_version });
    return response.json(publicAdminProfile(updated));
  } catch (error) {
    console.error("Admin profile update failed", error);
    return response.status(500).json({ error: "Gagal memperbarui profil." });
  }
});

app.post("/api/admin/logout", requireTrustedOrigin, (_request, response) => {
  response.clearCookie(adminCookie, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/" });
  return response.status(204).end();
});

app.get("/api/posts", async (request, response) => {
  const { category, q } = request.query;
  try {
    let query = getSupabase().from("posts").select("*");
    if (typeof category === "string" && category !== "Semua info") query = query.eq("category", category);
    if (typeof q === "string" && q.trim()) {
      const safeQuery = q.trim().replace(/[%,.*()\\"']/g, " ").slice(0, 120);
      query = query.or(`title.ilike.%${safeQuery}%,organization.ilike.%${safeQuery}%,description.ilike.%${safeQuery}%`);
    }
    const { data, error } = await query.order("featured", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return response.json((data || []).map((row) => toApiPost(row as PostRow)));
  } catch (error) {
    console.error("Public post list failed", error);
    return response.status(503).json({ error: "Informasi mading belum tersedia." });
  }
});

app.get("/api/posts/:id", async (request, response) => {
  try {
    const { data, error } = await getSupabase().from("posts").select("*").eq("id", request.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return response.status(404).json({ error: "Informasi tidak ditemukan" });
    return response.json(toApiPost(data as PostRow));
  } catch (error) {
    console.error("Public post lookup failed", error);
    return response.status(503).json({ error: "Informasi mading belum tersedia." });
  }
});

const adminPosts = express.Router();

adminPosts.get("/", async (_request, response) => {
  try {
    const { data, error } = await getSupabase().from("posts").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false });
    if (error) throw error;
    return response.json((data || []).map((row) => toApiPost(row as PostRow)));
  } catch (error) {
    console.error("Admin post list failed", error);
    return response.status(500).json({ error: "Gagal memuat informasi." });
  }
});

adminPosts.post("/", async (request, response) => {
  const post = validatePost(request.body);
  if (!post) return response.status(400).json({ error: "Lengkapi semua field wajib dan pilih kategori yang valid." });
  try {
    const { data, error } = await getSupabase().from("posts").insert(toDatabasePost(post)).select("*").single();
    if (error?.code === "23505") return response.status(409).json({ error: "Judul informasi sudah digunakan." });
    if (error) throw error;
    return response.status(201).json(toApiPost(data as PostRow));
  } catch (error) {
    console.error("Admin post create failed", error);
    return response.status(500).json({ error: "Gagal membuat informasi." });
  }
});

adminPosts.put("/:id", async (request, response) => {
  const post = validatePost(request.body);
  if (!post) return response.status(400).json({ error: "Lengkapi semua field wajib dan pilih kategori yang valid." });
  try {
    const { data, error } = await getSupabase().from("posts").update(toDatabasePost(post)).eq("id", request.params.id).select("*").maybeSingle();
    if (error?.code === "23505") return response.status(409).json({ error: "Judul informasi sudah digunakan." });
    if (error) throw error;
    if (!data) return response.status(404).json({ error: "Informasi tidak ditemukan." });
    return response.json(toApiPost(data as PostRow));
  } catch (error) {
    console.error("Admin post update failed", error);
    return response.status(500).json({ error: "Gagal memperbarui informasi." });
  }
});

adminPosts.delete("/:id", async (request, response) => {
  try {
    const { data, error } = await getSupabase().from("posts").delete().eq("id", request.params.id).select("id").maybeSingle();
    if (error) throw error;
    if (!data) return response.status(404).json({ error: "Informasi tidak ditemukan." });
    return response.status(204).end();
  } catch (error) {
    console.error("Admin post delete failed", error);
    return response.status(500).json({ error: "Gagal menghapus informasi." });
  }
});

app.use("/api/admin/posts", requireTrustedOrigin, requireAdmin, adminPosts);

if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`PapanUB API running at http://localhost:${port}`));
}

export default app;
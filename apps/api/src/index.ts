import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { compare, hash } from "bcryptjs";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4000);
const bootstrapUsername = process.env.ADMIN_USERNAME || (process.env.NODE_ENV === "production" ? "" : "admin");
const bootstrapPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : "admin123");
const sessionSecret = process.env.ADMIN_SESSION_SECRET || (process.env.NODE_ENV === "production" ? "" : "papanub-local-development-session-secret");
const adminCookie = "papanub_admin";
const sessionTtlSeconds = 2 * 60 * 60;
const allowedOrigins = (process.env.WEB_ORIGIN || "http://localhost:3000").split(",").map((origin) => origin.trim());
const categories = ["Beasiswa", "Organisasi", "Acara", "Kompetisi", "Pengumuman"] as const;

if (process.env.NODE_ENV === "production" && sessionSecret.length < 32) {
  throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters in production.");
}
if (process.env.NODE_ENV === "production" && (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN)) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required for production login rate limiting.");
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
    const user = await prisma.adminUser.findUnique({ where: { id: session.id } });
    if (!user || user.sessionVersion !== session.sessionVersion) return response.status(401).json({ error: "Sesi admin sudah dicabut. Silakan masuk kembali." });
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

function sendAdminSession(response: Response, user: { id: string; sessionVersion: number }) {
  setSessionCookie(response, user);
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
  if (!distributedLoginLimiter) return loginLimiter(request, response, next);
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

function publicAdminProfile(user: { id: string; username: string; displayName: string; email: string }) {
  return { id: user.id, username: user.username, displayName: user.displayName, email: user.email };
}

async function ensureBootstrapAdmin() {
  const existing = await prisma.adminUser.findFirst();
  if (existing) return existing;
  if (!bootstrapUsername || !bootstrapPassword) return null;
  if (bootstrapPassword.length < 12 && process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_PASSWORD must be at least 12 characters for first-time production setup.");
  }
  const passwordHash = await hash(bootstrapPassword, 12);
  return prisma.adminUser.create({
    data: {
      username: bootstrapUsername,
      displayName: process.env.ADMIN_DISPLAY_NAME || "Superadmin PapanUB",
      email: process.env.ADMIN_EMAIL || "admin@papanub.local",
      passwordHash,
    },
  });
}

app.post("/api/admin/login", requireTrustedOrigin, enforceLoginLimit, async (request, response) => {
  const username = typeof request.body?.username === "string" ? request.body.username.trim() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  if (!username || !password || username.length > 120 || password.length > 256) {
    return response.status(400).json({ error: "Masukkan username dan password yang valid." });
  }

  try {
    const firstAdmin = await ensureBootstrapAdmin();
    if (!firstAdmin) return response.status(503).json({ error: "Admin belum dikonfigurasi. Atur kredensial bootstrap di environment backend." });
    const user = await prisma.adminUser.findUnique({ where: { username } });
    const valid = await compare(password, user?.passwordHash || "$2b$12$invalid.invalid.invalid.invalid.invalid.invalid.invalid.invalid");
    if (!user || !valid) return response.status(401).json({ error: "Username atau password tidak sesuai." });

    setSessionCookie(response, user);
    return response.json({ profile: publicAdminProfile(user), expiresIn: sessionTtlSeconds });
  } catch (error) {
    console.error("Admin login failed", error);
    return response.status(503).json({ error: "Login tidak dapat diproses saat ini." });
  }
});

app.get("/api/admin/session", requireAdmin, (_request, response) => response.json(publicAdminProfile(response.locals.adminUser)));

app.get("/api/admin/profile", requireAdmin, (_request, response) => response.json(publicAdminProfile(response.locals.adminUser)));

app.put("/api/admin/profile", requireTrustedOrigin, requireAdmin, async (request, response) => {
  const user = response.locals.adminUser as { id: string; passwordHash: string; sessionVersion: number };
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

  if (!await compare(currentPassword, user.passwordHash)) return response.status(401).json({ error: "Password saat ini tidak sesuai." });
  try {
    const updated = await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        username: username.trim(),
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        ...(newPassword ? { passwordHash: await hash(newPassword, 12) } : {}),
        sessionVersion: { increment: 1 },
      },
    });
    setSessionCookie(response, updated);
    return response.json(publicAdminProfile(updated));
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") return response.status(409).json({ error: "Username atau email sudah digunakan." });
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
  const posts = await prisma.post.findMany({
    where: {
      ...(typeof category === "string" && category !== "Semua info" ? { category } : {}),
      ...(typeof q === "string" && q.trim() ? {
        OR: [
          { title: { contains: q.trim() } },
          { organization: { contains: q.trim() } },
          { description: { contains: q.trim() } },
        ],
      } : {}),
    },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  response.json(posts);
});

app.get("/api/posts/:id", async (request, response) => {
  const post = await prisma.post.findUnique({ where: { id: request.params.id } });
  if (!post) return response.status(404).json({ error: "Informasi tidak ditemukan" });
  return response.json(post);
});

const adminPosts = express.Router();

adminPosts.get("/", async (_request, response) => {
  try {
    return response.json(await prisma.post.findMany({ orderBy: [{ featured: "desc" }, { createdAt: "desc" }] }));
  } catch {
    return response.status(500).json({ error: "Gagal memuat informasi." });
  }
});

adminPosts.post("/", async (request, response) => {
  const post = validatePost(request.body);
  if (!post) return response.status(400).json({ error: "Lengkapi semua field wajib dan pilih kategori yang valid." });
  try {
    return response.status(201).json(await prisma.post.create({ data: post }));
  } catch (error) {
    const code = (error as { code?: string }).code;
    return response.status(code === "P2002" ? 409 : 500).json({ error: code === "P2002" ? "Judul informasi sudah digunakan." : "Gagal membuat informasi." });
  }
});

adminPosts.put("/:id", async (request, response) => {
  const post = validatePost(request.body);
  if (!post) return response.status(400).json({ error: "Lengkapi semua field wajib dan pilih kategori yang valid." });
  try {
    return response.json(await prisma.post.update({ where: { id: request.params.id }, data: post }));
  } catch (error) {
    const code = (error as { code?: string }).code;
    return response.status(code === "P2025" ? 404 : code === "P2002" ? 409 : 500).json({ error: code === "P2025" ? "Informasi tidak ditemukan." : code === "P2002" ? "Judul informasi sudah digunakan." : "Gagal memperbarui informasi." });
  }
});

adminPosts.delete("/:id", async (request, response) => {
  try {
    await prisma.post.delete({ where: { id: request.params.id } });
    return response.status(204).end();
  } catch (error) {
    const code = (error as { code?: string }).code;
    return response.status(code === "P2025" ? 404 : 500).json({ error: code === "P2025" ? "Informasi tidak ditemukan." : "Gagal menghapus informasi." });
  }
});

app.use("/api/admin/posts", requireTrustedOrigin, requireAdmin, adminPosts);

if (process.env.VERCEL) {
  app.listen(port, () => undefined);
} else {
  app.listen(port, () => console.log(`PapanUB API running at http://localhost:${port}`));
}

export default app;
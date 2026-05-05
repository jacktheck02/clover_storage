import { AwsClient } from "aws4fetch";
import { Resend } from "resend";

type Env = {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  CLOVER_BACKEND_SECRET: string;
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
};

type D1Value = string | number | boolean | null;
type FileType = "document" | "image" | "video" | "audio" | "other";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const OTP_MAX_AGE_SECONDS = 5 * 60;
const AVATAR_PLACEHOLDER_URL =
  "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png";
const encoder = new TextEncoder();

type UserRow = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  owner_id: string;
  r2_key: string;
  name: string;
  extension: string;
  type: FileType;
  size: number;
  mime_type: string;
  created_at: string;
  updated_at: string;
  owner_full_name: string;
  owner_email: string;
  shared_users: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function bindAll(statement: D1PreparedStatement, values: D1Value[]) {
  return values.length ? statement.bind(...values) : statement;
}

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function generateOtp() {
  const value = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return value.toString().padStart(6, "0");
}

async function hashSecret(secret: string, salt: string) {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}:${secret}`)
  );
  return toHex(buffer);
}

async function bodyJson<T>(request: Request) {
  return (await request.json().catch(() => ({}))) as T;
}

function assertAuthorized(request: Request, env: Env) {
  const expected = env.CLOVER_BACKEND_SECRET;
  const actual = request.headers.get("x-clover-backend-secret");
  if (!expected || actual !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function getFileType(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const documents = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "xls",
    "xlsx",
    "csv",
    "rtf",
    "ods",
    "ppt",
    "odp",
    "md",
    "html",
    "htm",
    "epub",
    "pages",
    "fig",
    "psd",
    "ai",
    "indd",
    "xd",
    "sketch",
    "afdesign",
    "afphoto",
  ];
  if (documents.includes(extension)) return { type: "document" as const, extension };
  if (["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"].includes(extension)) {
    return { type: "image" as const, extension };
  }
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(extension)) {
    return { type: "video" as const, extension };
  }
  if (["mp3", "wav", "ogg", "flac"].includes(extension)) {
    return { type: "audio" as const, extension };
  }
  return { type: "other" as const, extension };
}

function buildR2Key(userId: string, fileId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/${userId}/files/${fileId}/${safeName}`;
}

function mapUser(user: UserRow) {
  return {
    $id: user.id,
    $createdAt: user.created_at,
    $updatedAt: user.updated_at,
    accountId: user.id,
    fullName: user.full_name,
    email: user.email,
    avatar: user.avatar_url,
  };
}

function mapFile(file: FileRow) {
  return {
    $id: file.id,
    $createdAt: file.created_at,
    $updatedAt: file.updated_at,
    type: file.type,
    name: file.name,
    url: `/api/files/${file.id}/view`,
    extension: file.extension,
    size: file.size,
    owner: {
      $id: file.owner_id,
      fullName: file.owner_full_name,
      email: file.owner_email,
    },
    accountId: file.owner_id,
    users: file.shared_users ? file.shared_users.split(",").filter(Boolean) : [],
    bucketFileId: file.id,
    r2Key: file.r2_key,
    mimeType: file.mime_type,
  };
}

async function getUserByEmail(env: Env, email: string) {
  return env.DB.prepare(
    `SELECT id, email, full_name, avatar_url, created_at, updated_at
     FROM user_profiles
     WHERE email = ?`
  )
    .bind(normalizeEmail(email))
    .first<UserRow>();
}

async function getUserById(env: Env, id: string) {
  return env.DB.prepare(
    `SELECT id, email, full_name, avatar_url, created_at, updated_at
     FROM user_profiles
     WHERE id = ?`
  )
    .bind(id)
    .first<UserRow>();
}

async function assertRateLimit(
  env: Env,
  key: string,
  action: string,
  limit: number,
  windowSeconds: number
) {
  const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
  const result = await env.DB.prepare(
    `SELECT count FROM auth_rate_limits
     WHERE key = ? AND action = ? AND window_start = ?`
  )
    .bind(key, action, windowStart)
    .first<{ count: number }>();

  if ((result?.count || 0) >= limit) {
    throw new Response("Too many attempts. Please try again later.", {
      status: 429,
    });
  }

  await env.DB.prepare(
    `INSERT INTO auth_rate_limits (key, action, window_start, count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(key, action, window_start)
     DO UPDATE SET count = count + 1`
  )
    .bind(key, action, windowStart)
    .run();
}

async function verifyTurnstileToken(env: Env, token?: string) {
  if (env.TURNSTILE_ENABLED !== "true") return true;
  if (!env.TURNSTILE_SECRET_KEY || !token) return false;

  const formData = new FormData();
  formData.append("secret", env.TURNSTILE_SECRET_KEY);
  formData.append("response", token);

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: formData }
  );
  const result = (await response.json()) as { success?: boolean };
  return result.success === true;
}

async function sendOtpEmail(env: Env, email: string, otp: string) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.info(`Clover OTP for ${email}: ${otp}`);
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: email,
    subject: "Your Clover sign-in code",
    text: `Your Clover sign-in code is ${otp}. It expires in 5 minutes.`,
  });

  if (error) {
    console.error("Failed to send OTP email", error);
    throw new Response("Failed to send OTP email", { status: 502 });
  }
}

async function sendEmailOtp(env: Env, email: string, turnstileToken?: string) {
  const normalizedEmail = normalizeEmail(email);
  const verified = await verifyTurnstileToken(env, turnstileToken);
  if (!verified) throw new Response("Failed bot check", { status: 400 });

  const user = await getUserByEmail(env, normalizedEmail);
  if (!user) return null;

  await assertRateLimit(env, normalizedEmail, "otp-send", 3, 60);

  const otp = generateOtp();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OTP_MAX_AGE_SECONDS * 1000).toISOString();
  const otpHash = await hashSecret(otp, user.id);

  await env.DB.prepare("DELETE FROM auth_otps WHERE user_id = ?")
    .bind(user.id)
    .run();
  await env.DB.prepare(
    `INSERT INTO auth_otps
      (id, user_id, email, otp_hash, attempts, expires_at, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(crypto.randomUUID(), user.id, normalizedEmail, otpHash, expiresAt, createdAt)
    .run();

  await sendOtpEmail(env, normalizedEmail, otp);
  return user.id;
}

async function createPresignedUploadUrl(env: Env, key: string) {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME
  ) {
    return null;
  }

  const client = new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const url = new URL(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET_NAME}/${key}`
  );
  url.searchParams.set("X-Amz-Expires", "300");

  const signed = await client.sign(new Request(url, { method: "PUT" }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

async function handleAuth(request: Request, env: Env, path: string) {
  if (path === "/auth/send-otp") {
    const body = await bodyJson<{ email: string; turnstileToken?: string }>(request);
    const accountId = await sendEmailOtp(env, body.email, body.turnstileToken);
    return json({ accountId });
  }

  if (path === "/auth/create") {
    const body = await bodyJson<{ fullName: string; email: string }>(request);
    const email = normalizeEmail(body.email);
    let user = await getUserByEmail(env, email);
    if (!user) {
      const now = nowIso();
      const id = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO user_profiles
          (id, email, full_name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
        .bind(id, email, body.fullName, AVATAR_PLACEHOLDER_URL, now, now)
        .run();
      user = await getUserById(env, id);
    }
    if (!user) throw new Response("Failed to create account", { status: 500 });
    const accountId = await sendEmailOtp(env, email);
    if (!accountId) throw new Response("Failed to send an OTP", { status: 500 });
    return json({ accountId });
  }

  if (path === "/auth/sign-in") {
    const body = await bodyJson<{ email: string }>(request);
    const email = normalizeEmail(body.email);
    const user = await getUserByEmail(env, email);
    if (!user) return json({ accountId: null, error: "User not found" });
    await sendEmailOtp(env, email);
    return json({ accountId: user.id });
  }

  if (path === "/auth/verify") {
    const body = await bodyJson<{ accountId: string; password: string }>(request);
    await assertRateLimit(env, body.accountId, "otp-verify", 5, 5 * 60);
    const otp = await env.DB.prepare(
      `SELECT id, otp_hash, attempts, expires_at
       FROM auth_otps
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`
    )
      .bind(body.accountId)
      .first<{ id: string; otp_hash: string; attempts: number; expires_at: string }>();

    if (!otp || new Date(otp.expires_at).getTime() < Date.now()) {
      throw new Response("OTP expired", { status: 400 });
    }
    if (otp.attempts >= 3) {
      throw new Response("Too many invalid attempts", { status: 429 });
    }
    const hash = await hashSecret(body.password, body.accountId);
    if (hash !== otp.otp_hash) {
      await env.DB.prepare("UPDATE auth_otps SET attempts = attempts + 1 WHERE id = ?")
        .bind(otp.id)
        .run();
      throw new Response("Invalid OTP", { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    const token = randomToken();
    const tokenHash = await hashSecret(token, body.accountId);
    const now = nowIso();
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM auth_otps WHERE user_id = ?").bind(body.accountId),
      env.DB.prepare(
        `INSERT INTO auth_sessions
          (id, user_id, token_hash, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(sessionId, body.accountId, tokenHash, expiresAt, now, now),
    ]);
    return json({ sessionId, token, maxAge: SESSION_MAX_AGE_SECONDS });
  }

  if (path === "/auth/current") {
    const body = await bodyJson<{ session?: string }>(request);
    const [userId, token] = (body.session || "").split(".");
    if (!userId || !token) return json({ user: null });
    const tokenHash = await hashSecret(token, userId);
    const user = await env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.avatar_url, u.created_at, u.updated_at
       FROM auth_sessions s
       INNER JOIN user_profiles u ON u.id = s.user_id
       WHERE s.user_id = ? AND s.token_hash = ? AND s.expires_at > ?
       LIMIT 1`
    )
      .bind(userId, tokenHash, nowIso())
      .first<UserRow>();
    return json({ user: user ? mapUser(user) : null });
  }

  if (path === "/auth/sign-out") {
    const body = await bodyJson<{ session?: string }>(request);
    const [userId, token] = (body.session || "").split(".");
    if (userId && token) {
      const tokenHash = await hashSecret(token, userId);
      await env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash = ?")
        .bind(userId, tokenHash)
        .run();
    }
    return json({ status: "success" });
  }

  return null;
}

async function handleFiles(request: Request, env: Env, path: string) {
  if (path === "/files/list") {
    const body = await bodyJson<{
      ownerId: string;
      email: string;
      types?: string[];
      searchText?: string;
      sort?: string;
      limit?: number;
    }>(request);
    const conditions = [
      "f.status = 'active'",
      `(f.owner_id = ? OR EXISTS (
        SELECT 1 FROM file_shares fs
        WHERE fs.file_id = f.id AND fs.email = ?
      ))`,
    ];
    const values: D1Value[] = [body.ownerId, normalizeEmail(body.email)];
    if (body.types?.length) {
      conditions.push(`f.type IN (${body.types.map(() => "?").join(", ")})`);
      values.push(...body.types);
    }
    if (body.searchText) {
      conditions.push("LOWER(f.name) LIKE ?");
      values.push(`%${body.searchText.toLowerCase()}%`);
    }

    const [rawSortBy = "$createdAt", rawOrderBy = "desc"] = (body.sort || "$createdAt-desc").split("-");
    const sortMap: Record<string, string> = {
      $createdAt: "f.created_at",
      $updatedAt: "f.updated_at",
      name: "f.name",
      size: "f.size",
    };
    const order = `${sortMap[rawSortBy] || "f.created_at"} ${rawOrderBy === "asc" ? "ASC" : "DESC"}`;
    const limitSql = body.limit ? " LIMIT ?" : "";
    if (body.limit) values.push(body.limit);
    const where = conditions.join(" AND ");
    const baseSql = "FROM files f INNER JOIN user_profiles owner ON owner.id = f.owner_id";

    const rows = await bindAll(
      env.DB.prepare(`
        SELECT f.id, f.owner_id, f.r2_key, f.name, f.extension, f.type, f.size,
          f.mime_type, f.created_at, f.updated_at, owner.full_name AS owner_full_name,
          owner.email AS owner_email, GROUP_CONCAT(fs.email) AS shared_users
        ${baseSql}
        LEFT JOIN file_shares fs ON fs.file_id = f.id
        WHERE ${where}
        GROUP BY f.id
        ORDER BY ${order}
        ${limitSql}
      `),
      values
    ).all<FileRow>();
    const countValues = body.limit ? values.slice(0, -1) : values;
    const total = await bindAll(
      env.DB.prepare(`SELECT COUNT(*) AS total ${baseSql} WHERE ${where}`),
      countValues
    ).first<{ total: number }>();
    return json({
      total: total?.total || 0,
      documents: (rows.results as FileRow[]).map(mapFile),
    });
  }

  if (path === "/files/rename") {
    const body = await bodyJson<{ userId: string; fileId: string; name: string; extension: string }>(request);
    await env.DB.prepare(
      `UPDATE files SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?`
    )
      .bind(`${body.name}.${body.extension}`, nowIso(), body.fileId, body.userId)
      .run();
    return json({ status: "success" });
  }

  if (path === "/files/share") {
    const body = await bodyJson<{ userId: string; userEmail: string; fileId: string; emails: string[] }>(request);
    const ownedFile = await env.DB.prepare("SELECT id FROM files WHERE id = ? AND owner_id = ?")
      .bind(body.fileId, body.userId)
      .first<{ id: string }>();
    if (!ownedFile) throw new Response("File not found", { status: 404 });
    const emails = [
      ...new Set(
        body.emails
          .map((email) => normalizeEmail(email))
          .filter((email) => email && email !== normalizeEmail(body.userEmail))
      ),
    ];
    const now = nowIso();
    await env.DB.batch([
      env.DB.prepare("DELETE FROM file_shares WHERE file_id = ?").bind(body.fileId),
      ...emails.map((email) =>
        env.DB.prepare("INSERT INTO file_shares (file_id, email, created_at) VALUES (?, ?, ?)")
          .bind(body.fileId, email, now)
      ),
      env.DB.prepare("UPDATE files SET updated_at = ? WHERE id = ?").bind(now, body.fileId),
    ]);
    return json({ status: "success" });
  }

  if (path === "/files/delete") {
    const body = await bodyJson<{ userId: string; fileId: string; bucketFileId?: string }>(request);
    const file = await env.DB.prepare("SELECT r2_key FROM files WHERE id = ? AND owner_id = ?")
      .bind(body.fileId, body.userId)
      .first<{ r2_key: string }>();
    if (!file) throw new Response("File not found", { status: 404 });
    await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(body.fileId).run();
    await env.FILES_BUCKET.delete(file.r2_key || body.bucketFileId || body.fileId);
    return json({ status: "success" });
  }

  if (path === "/files/total-space") {
    const body = await bodyJson<{ ownerId: string }>(request);
    const rows = await env.DB.prepare(
      "SELECT type, size, updated_at FROM files WHERE owner_id = ? AND status = 'active'"
    )
      .bind(body.ownerId)
      .all<{ type: FileType; size: number; updated_at: string }>();
    const totalSpace = {
      image: { size: 0, latestDate: "" },
      document: { size: 0, latestDate: "" },
      video: { size: 0, latestDate: "" },
      audio: { size: 0, latestDate: "" },
      other: { size: 0, latestDate: "" },
      used: 0,
      all: 128 * 1024 * 1024,
    };
    (rows.results as { type: FileType; size: number; updated_at: string }[]).forEach((file) => {
      totalSpace[file.type].size += file.size;
      totalSpace.used += file.size;
      if (!totalSpace[file.type].latestDate || new Date(file.updated_at) > new Date(totalSpace[file.type].latestDate)) {
        totalSpace[file.type].latestDate = file.updated_at;
      }
    });
    return json(totalSpace);
  }

  return null;
}

async function handleUploads(request: Request, env: Env, path: string) {
  if (path === "/uploads/intent") {
    const body = await bodyJson<{ userId: string; name: string; size: number; type?: string }>(request);
    if (!body.name || !body.size || body.size <= 0) {
      throw new Response("Invalid file metadata", { status: 400 });
    }
    if (body.size > MAX_FILE_SIZE) {
      throw new Response("File too large", { status: 413 });
    }
    await assertRateLimit(env, body.userId, "upload-intent", 30, 60);
    const fileId = crypto.randomUUID();
    const now = nowIso();
    const { type, extension } = getFileType(body.name);
    const r2Key = buildR2Key(body.userId, fileId, body.name);
    await env.DB.prepare(
      `INSERT INTO files
        (id, owner_id, r2_key, name, extension, type, size, mime_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(fileId, body.userId, r2Key, body.name, extension, type, body.size, body.type || "application/octet-stream", now, now)
      .run();
    const uploadUrl = await createPresignedUploadUrl(env, r2Key);
    return json({ fileId, r2Key, uploadUrl, method: "PUT", directToR2: Boolean(uploadUrl) });
  }

  if (path === "/uploads/complete") {
    const body = await bodyJson<{ userId: string; fileId: string }>(request);
    const pending = await env.DB.prepare(
      `SELECT r2_key FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(body.fileId, body.userId)
      .first<{ r2_key: string }>();
    if (!pending) throw new Response("Upload not found", { status: 404 });
    const object = await env.FILES_BUCKET.head(pending.r2_key);
    if (!object) throw new Response("Object was not uploaded", { status: 400 });
    await env.DB.prepare(
      "UPDATE files SET status = 'active', updated_at = ? WHERE id = ? AND owner_id = ?"
    )
      .bind(nowIso(), body.fileId, body.userId)
      .run();
    return json({ status: "success" });
  }

  const directMatch = path.match(/^\/uploads\/direct\/([^/]+)$/);
  if (directMatch && request.method === "PUT") {
    const fileId = directMatch[1];
    const userId = request.headers.get("x-clover-user-id");
    if (!userId) throw new Response("Unauthorized", { status: 401 });
    const file = await env.DB.prepare(
      `SELECT r2_key, mime_type FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(fileId, userId)
      .first<{ r2_key: string; mime_type: string }>();
    if (!file) throw new Response("Upload not found", { status: 404 });
    await env.FILES_BUCKET.put(file.r2_key, request.body, {
      httpMetadata: {
        contentType: request.headers.get("content-type") || file.mime_type,
      },
    });
    return json({ status: "uploaded" });
  }

  return null;
}

async function handleFileObject(request: Request, env: Env, path: string) {
  const match = path.match(/^\/files\/([^/]+)\/(view|download)$/);
  if (!match) return null;
  const [, fileId, mode] = match;
  const userId = request.headers.get("x-clover-user-id");
  const email = request.headers.get("x-clover-user-email");
  if (!userId || !email) throw new Response("Unauthorized", { status: 401 });
  const file = await env.DB.prepare(
    `SELECT f.r2_key, f.name, f.mime_type
     FROM files f
     WHERE f.id = ?
       AND f.status = 'active'
       AND (
         f.owner_id = ?
         OR EXISTS (
           SELECT 1 FROM file_shares fs
           WHERE fs.file_id = f.id AND fs.email = ?
         )
       )`
  )
    .bind(fileId, userId, normalizeEmail(email))
    .first<{ r2_key: string; name: string; mime_type: string }>();
  if (!file) return new Response("Not found", { status: 404 });
  const object = await env.FILES_BUCKET.get(file.r2_key);
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", file.mime_type || "application/octet-stream");
  if (mode === "download") {
    headers.set("content-disposition", `attachment; filename="${file.name.replaceAll('"', '\\"')}"`);
  } else {
    headers.set("cache-control", "private, max-age=60");
  }
  return new Response(object.body, { headers });
}

const worker = {
  async fetch(request: Request, env: Env) {
    try {
      if (request.method === "OPTIONS") return new Response(null, { status: 204 });
      assertAuthorized(request, env);
      const path = new URL(request.url).pathname;
      const response =
        (await handleAuth(request, env, path)) ||
        (await handleFiles(request, env, path)) ||
        (await handleUploads(request, env, path)) ||
        (await handleFileObject(request, env, path));
      return response || json({ error: "Not found" }, { status: 404 });
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(error);
      return json({ error: "Internal server error" }, { status: 500 });
    }
  },
};

export default worker;

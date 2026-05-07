import { Resend } from "resend";
import { z } from "zod";

type Env = {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  CLOVER_BACKEND_SECRET: string;
  AUTH_SECRET?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
};

type D1Value = string | number | boolean | null;
type FileType = "document" | "image" | "video" | "audio" | "other";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const USER_STORAGE_LIMIT = 128 * 1024 * 1024;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const OTP_MAX_AGE_SECONDS = 5 * 60;
const SIGNUP_ACCOUNT_PREFIX = "signup:";
const AVATAR_PLACEHOLDER_URL =
  "https://cdn.pixabay.com/photo/2016/08/08/09/17/avatar-1577909_960_720.png";
const encoder = new TextEncoder();

const fileTypeValues = ["document", "image", "video", "audio", "other"] as const;
const sortValues = [
  "$createdAt-desc",
  "$createdAt-asc",
  "$updatedAt-desc",
  "$updatedAt-asc",
  "name-desc",
  "name-asc",
  "size-desc",
  "size-asc",
] as const;
const dangerousInlineExtensions = new Set([
  "css",
  "htm",
  "html",
  "js",
  "json",
  "mjs",
  "svg",
  "xhtml",
  "xml",
]);
const inlineSafeMimeTypes = new Set([
  "application/pdf",
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

const emailSchema = z.string().trim().toLowerCase().email().max(254);
const actorSchema = z.object({
  userId: z.string().uuid(),
  email: emailSchema,
});
const sortSchema = z
  .enum(sortValues)
  .optional()
  .catch("$createdAt-desc")
  .default("$createdAt-desc");
const fileListSchema = z.object({
  types: z.array(z.enum(fileTypeValues)).max(fileTypeValues.length).default([]),
  searchText: z.string().trim().max(100).default(""),
  sort: z
    .preprocess((value) => (value === "" ? undefined : value), sortSchema)
    .optional()
    .default("$createdAt-desc"),
  limit: z.number().int().min(1).max(100).optional(),
});
const fileIdSchema = z.string().uuid();
const renameFileSchema = z.object({
  fileId: fileIdSchema,
  name: z.string().trim().min(1).max(180).regex(/^[^\r\n/\\]+$/),
  extension: z.string().trim().max(32).regex(/^[a-zA-Z0-9]*$/),
});
const shareFileSchema = z.object({
  fileId: fileIdSchema,
  emails: z.array(emailSchema).max(50),
});
const fileMutationSchema = z.object({
  fileId: fileIdSchema,
});
const uploadIntentSchema = z.object({
  name: z.string().trim().min(1).max(255).regex(/^[^\r\n/\\]+$/),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
  type: z.string().trim().max(100).optional(),
});
const createAccountSchema = z.object({
  fullName: z.string().trim().min(2).max(50),
  email: emailSchema,
  turnstileToken: z.string().optional(),
});
const sendOtpSchema = z.object({
  email: emailSchema,
  turnstileToken: z.string().optional(),
});
const signInSchema = z.object({
  email: emailSchema,
});
const verifyOtpSchema = z.object({
  accountId: z.string().trim().min(1).max(80),
  password: z.string().trim().regex(/^\d{6}$/),
});

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

type PendingSignupOtpRow = {
  id: string;
  email: string;
  full_name: string;
  otp_hash: string;
  attempts: number;
  expires_at: string;
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

async function parseBody<T extends z.ZodType>(request: Request, schema: T) {
  const body = await request.json().catch(() => ({}));
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new Response("Invalid request", { status: 400 });
  }
  return result.data;
}

function assertAuthorized(request: Request, env: Env) {
  const expected = env.CLOVER_BACKEND_SECRET;
  const actual = request.headers.get("x-clover-backend-secret");
  if (!expected || actual !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

function getActor(request: Request) {
  const result = actorSchema.safeParse({
    userId: request.headers.get("x-clover-user-id") || "",
    email: request.headers.get("x-clover-user-email") || "",
  });
  if (!result.success) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return result.data;
}

function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function getCanonicalMimeType(fileName: string) {
  const extension = getExtension(fileName);
  if (!extension || dangerousInlineExtensions.has(extension)) {
    return "application/octet-stream";
  }

  const mimeByExtension: Record<string, string> = {
    bmp: "image/bmp",
    csv: "text/csv",
    flac: "audio/flac",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    m4a: "audio/mp4",
    md: "text/markdown",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    png: "image/png",
    txt: "text/plain",
    wav: "audio/wav",
    webm: "video/webm",
    webp: "image/webp",
  };

  return mimeByExtension[extension] || "application/octet-stream";
}

function isInlineSafeMimeType(mimeType: string) {
  return inlineSafeMimeTypes.has(mimeType.split(";")[0].toLowerCase());
}

function contentDisposition(disposition: "attachment" | "inline", fileName: string) {
  const fallback = fileName
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 180) || "file";
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

async function getReservedStorage(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `SELECT COALESCE(SUM(size), 0) AS used
     FROM files
     WHERE owner_id = ? AND status IN ('pending', 'active')`
  )
    .bind(userId)
    .first<{ used: number }>();
  return result?.used || 0;
}

async function getActiveStorage(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `SELECT COALESCE(SUM(size), 0) AS used
     FROM files
     WHERE owner_id = ? AND status = 'active'`
  )
    .bind(userId)
    .first<{ used: number }>();
  return result?.used || 0;
}

async function rejectPendingUpload(env: Env, fileId: string, r2Key: string) {
  await env.FILES_BUCKET.delete(r2Key);
  await env.DB.prepare("DELETE FROM files WHERE id = ? AND status = 'pending'")
    .bind(fileId)
    .run();
}

function getFileType(fileName: string) {
  const extension = getExtension(fileName);
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
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) {
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

async function sendSignupOtp(
  env: Env,
  email: string,
  fullName: string,
  turnstileToken?: string
) {
  const normalizedEmail = normalizeEmail(email);
  const verified = await verifyTurnstileToken(env, turnstileToken);
  if (!verified) throw new Response("Failed bot check", { status: 400 });

  const existingUser = await getUserByEmail(env, normalizedEmail);
  if (existingUser) {
    return sendEmailOtp(env, normalizedEmail, turnstileToken);
  }

  await assertRateLimit(env, normalizedEmail, "signup-otp-send", 3, 60);

  const id = `${SIGNUP_ACCOUNT_PREFIX}${crypto.randomUUID()}`;
  const otp = generateOtp();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OTP_MAX_AGE_SECONDS * 1000).toISOString();
  const otpHash = await hashSecret(otp, id);

  await env.DB.prepare("DELETE FROM auth_signup_otps WHERE email = ?")
    .bind(normalizedEmail)
    .run();
  await env.DB.prepare(
    `INSERT INTO auth_signup_otps
      (id, email, full_name, otp_hash, attempts, expires_at, created_at)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  )
    .bind(id, normalizedEmail, fullName, otpHash, expiresAt, createdAt)
    .run();

  await sendOtpEmail(env, normalizedEmail, otp);
  return id;
}

function limitUploadBody(
  body: ReadableStream<Uint8Array> | null,
  expectedSize: number
) {
  if (!body) {
    throw new Response("Missing upload body", { status: 400 });
  }

  let bytesRead = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytesRead += chunk.byteLength;
        if (bytesRead > expectedSize || bytesRead > MAX_FILE_SIZE) {
          throw new Error("Uploaded object size does not match the upload intent");
        }
        controller.enqueue(chunk);
      },
    })
  );
}

async function createSession(env: Env, userId: string) {
  const sessionId = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await hashSecret(token, userId);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000).toISOString();
  await env.DB.prepare(
    `INSERT INTO auth_sessions
      (id, user_id, token_hash, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(sessionId, userId, tokenHash, expiresAt, now, now)
    .run();

  return { sessionId, token, accountId: userId, maxAge: SESSION_MAX_AGE_SECONDS };
}

async function handleAuth(request: Request, env: Env, path: string) {
  if (path === "/auth/send-otp") {
    const body = await parseBody(request, sendOtpSchema);
    const accountId = await sendEmailOtp(env, body.email, body.turnstileToken);
    return json({ accountId });
  }

  if (path === "/auth/create") {
    const body = await parseBody(request, createAccountSchema);
    const accountId = await sendSignupOtp(
      env,
      body.email,
      body.fullName,
      body.turnstileToken
    );
    if (!accountId) throw new Response("Failed to send an OTP", { status: 500 });
    return json({ accountId });
  }

  if (path === "/auth/sign-in") {
    const body = await parseBody(request, signInSchema);
    const email = normalizeEmail(body.email);
    const user = await getUserByEmail(env, email);
    if (!user) return json({ accountId: null, error: "User not found" });
    await sendEmailOtp(env, email);
    return json({ accountId: user.id });
  }

  if (path === "/auth/verify") {
    const body = await parseBody(request, verifyOtpSchema);
    await assertRateLimit(env, body.accountId, "otp-verify", 5, 5 * 60);

    if (body.accountId.startsWith(SIGNUP_ACCOUNT_PREFIX)) {
      const signupOtp = await env.DB.prepare(
        `SELECT id, email, full_name, otp_hash, attempts, expires_at
         FROM auth_signup_otps
         WHERE id = ?
         LIMIT 1`
      )
        .bind(body.accountId)
        .first<PendingSignupOtpRow>();

      if (!signupOtp || new Date(signupOtp.expires_at).getTime() < Date.now()) {
        throw new Response("OTP expired", { status: 400 });
      }
      if (signupOtp.attempts >= 3) {
        throw new Response("Too many invalid attempts", { status: 429 });
      }

      const hash = await hashSecret(body.password, body.accountId);
      if (hash !== signupOtp.otp_hash) {
        await env.DB.prepare("UPDATE auth_signup_otps SET attempts = attempts + 1 WHERE id = ?")
          .bind(signupOtp.id)
          .run();
        throw new Response("Invalid OTP", { status: 400 });
      }

      let user = await getUserByEmail(env, signupOtp.email);
      if (!user) {
        const now = nowIso();
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO user_profiles
            (id, email, full_name, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(id, signupOtp.email, signupOtp.full_name, AVATAR_PLACEHOLDER_URL, now, now)
          .run();
        user = await getUserById(env, id);
      }
      if (!user) throw new Response("Failed to create account", { status: 500 });

      const session = await createSession(env, user.id);
      await env.DB.prepare("DELETE FROM auth_signup_otps WHERE id = ?")
        .bind(signupOtp.id)
        .run();
      return json(session);
    }

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

    const session = await createSession(env, body.accountId);
    await env.DB.prepare("DELETE FROM auth_otps WHERE user_id = ?")
      .bind(body.accountId)
      .run();
    return json(session);
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
    const actor = getActor(request);
    const body = await parseBody(request, fileListSchema);
    const conditions = [
      "f.status = 'active'",
      `(f.owner_id = ? OR EXISTS (
        SELECT 1 FROM file_shares fs
        WHERE fs.file_id = f.id AND fs.email = ?
      ))`,
    ];
    const values: D1Value[] = [actor.userId, actor.email];
    if (body.types?.length) {
      conditions.push(`f.type IN (${body.types.map(() => "?").join(", ")})`);
      values.push(...body.types);
    }
    if (body.searchText) {
      conditions.push("LOWER(f.name) LIKE ?");
      values.push(`%${body.searchText.toLowerCase()}%`);
    }

    const [rawSortBy = "$createdAt", rawOrderBy = "desc"] = body.sort.split("-");
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
    const actor = getActor(request);
    const body = await parseBody(request, renameFileSchema);
    await env.DB.prepare(
      `UPDATE files SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?`
    )
      .bind(`${body.name}.${body.extension}`, nowIso(), body.fileId, actor.userId)
      .run();
    return json({ status: "success" });
  }

  if (path === "/files/share") {
    const actor = getActor(request);
    const body = await parseBody(request, shareFileSchema);
    const ownedFile = await env.DB.prepare("SELECT id FROM files WHERE id = ? AND owner_id = ?")
      .bind(body.fileId, actor.userId)
      .first<{ id: string }>();
    if (!ownedFile) throw new Response("File not found", { status: 404 });
    const emails = [
      ...new Set(
        body.emails
          .map((email) => normalizeEmail(email))
          .filter((email) => email && email !== actor.email)
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
    const actor = getActor(request);
    const body = await parseBody(request, fileMutationSchema);
    const file = await env.DB.prepare("SELECT r2_key FROM files WHERE id = ? AND owner_id = ?")
      .bind(body.fileId, actor.userId)
      .first<{ r2_key: string }>();
    if (!file) throw new Response("File not found", { status: 404 });
    await env.DB.prepare("DELETE FROM files WHERE id = ?").bind(body.fileId).run();
    await env.FILES_BUCKET.delete(file.r2_key);
    return json({ status: "success" });
  }

  if (path === "/files/total-space") {
    const actor = getActor(request);
    const rows = await env.DB.prepare(
      "SELECT type, size, updated_at FROM files WHERE owner_id = ? AND status = 'active'"
    )
      .bind(actor.userId)
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
    const actor = getActor(request);
    const body = await parseBody(request, uploadIntentSchema);
    await assertRateLimit(env, actor.userId, "upload-intent", 30, 60);
    const reservedStorage = await getReservedStorage(env, actor.userId);
    if (reservedStorage + body.size > USER_STORAGE_LIMIT) {
      throw new Response("Storage quota exceeded", { status: 413 });
    }
    const fileId = crypto.randomUUID();
    const now = nowIso();
    const { type, extension } = getFileType(body.name);
    const r2Key = buildR2Key(actor.userId, fileId, body.name);
    const mimeType = getCanonicalMimeType(body.name);
    await env.DB.prepare(
      `INSERT INTO files
        (id, owner_id, r2_key, name, extension, type, size, mime_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(fileId, actor.userId, r2Key, body.name, extension, type, body.size, mimeType, now, now)
      .run();
    return json({
      fileId,
      r2Key,
      uploadUrl: null,
      method: "PUT",
      directToR2: false,
    });
  }

  if (path === "/uploads/complete") {
    const actor = getActor(request);
    const body = await parseBody(request, fileMutationSchema);
    const pending = await env.DB.prepare(
      `SELECT r2_key, size FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(body.fileId, actor.userId)
      .first<{ r2_key: string; size: number }>();
    if (!pending) throw new Response("Upload not found", { status: 404 });
    const object = await env.FILES_BUCKET.head(pending.r2_key);
    if (!object) throw new Response("Object was not uploaded", { status: 400 });
    if (object.size !== pending.size || object.size > MAX_FILE_SIZE) {
      await rejectPendingUpload(env, body.fileId, pending.r2_key);
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    const activeStorage = await getActiveStorage(env, actor.userId);
    if (activeStorage + object.size > USER_STORAGE_LIMIT) {
      await rejectPendingUpload(env, body.fileId, pending.r2_key);
      throw new Response("Storage quota exceeded", { status: 413 });
    }
    await env.DB.prepare(
      "UPDATE files SET status = 'active', updated_at = ? WHERE id = ? AND owner_id = ?"
    )
      .bind(nowIso(), body.fileId, actor.userId)
      .run();
    return json({ status: "success" });
  }

  const directMatch = path.match(/^\/uploads\/direct\/([^/]+)$/);
  if (directMatch && request.method === "PUT") {
    const fileId = directMatch[1];
    const actor = getActor(request);
    const file = await env.DB.prepare(
      `SELECT r2_key, mime_type, size FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(fileId, actor.userId)
      .first<{ r2_key: string; mime_type: string; size: number }>();
    if (!file) throw new Response("Upload not found", { status: 404 });
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength && contentLength !== file.size) {
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    try {
      await env.FILES_BUCKET.put(file.r2_key, limitUploadBody(request.body, file.size), {
        httpMetadata: {
          contentType: file.mime_type,
        },
      });
    } catch (error) {
      await rejectPendingUpload(env, fileId, file.r2_key);
      if (error instanceof Response) throw error;
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    const object = await env.FILES_BUCKET.head(file.r2_key);
    if (!object || object.size !== file.size || object.size > MAX_FILE_SIZE) {
      await rejectPendingUpload(env, fileId, file.r2_key);
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    return json({ status: "uploaded" });
  }

  return null;
}

async function handleFileObject(request: Request, env: Env, path: string) {
  const match = path.match(/^\/files\/([^/]+)\/(view|download)$/);
  if (!match) return null;
  const [, fileId, mode] = match;
  const actor = getActor(request);
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
    .bind(fileId, actor.userId, actor.email)
    .first<{ r2_key: string; name: string; mime_type: string }>();
  if (!file) return new Response("Not found", { status: 404 });
  const rangeHeader = request.headers.get("range");
  const object = await env.FILES_BUCKET.get(
    file.r2_key,
    rangeHeader ? { range: request.headers } : undefined
  );
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  const inlineSafe = mode === "view" && isInlineSafeMimeType(file.mime_type);
  if (inlineSafe) {
    object.writeHttpMetadata(headers);
  }
  headers.set("content-type", inlineSafe ? file.mime_type : "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("content-security-policy", "default-src 'none'; sandbox");

  let status = 200;
  const partialRange = (object as R2ObjectBody & { range?: { offset?: number; length?: number } }).range;
  if (partialRange?.offset !== undefined && partialRange?.length !== undefined) {
    const start = partialRange.offset;
    const end = start + partialRange.length - 1;
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
    headers.set("content-length", String(partialRange.length));
    status = 206;
  }

  if (mode === "download" || !inlineSafe) {
    headers.set("content-disposition", contentDisposition("attachment", file.name));
  } else {
    headers.set("content-disposition", contentDisposition("inline", file.name));
    headers.set("cache-control", "private, max-age=60");
  }
  return new Response(object.body, { headers, status });
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

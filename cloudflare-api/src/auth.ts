import { Resend } from "resend";
import {
  createAccountSchema,
  actorSchema,
  sendOtpSchema,
  signInSchema,
  verifyOtpSchema,
} from "./schemas";
import { assertRateLimit } from "./rate-limit";
import { bodyJson, json, normalizeEmail, nowIso, parseBody } from "./http";
import {
  deriveOpaqueUuid,
  generateOtp,
  hashSecret,
  randomToken,
} from "./crypto";
import { getUserByEmail, getUserById, mapUser } from "./users";
import { OTP_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS } from "./constants";
import type { Env, PendingSignupOtpRow, UserRow } from "./types";

export function assertAuthorized(request: Request, env: Env) {
  const expected = env.CLOVER_BACKEND_SECRET;
  const actual = request.headers.get("x-clover-backend-secret");
  if (!expected || actual !== expected) {
    throw new Response("Unauthorized", { status: 401 });
  }
}

export async function getActor(request: Request, env: Env) {
  const session = request.headers.get("x-clover-session") || "";
  const [userId, token] = session.split(".");
  if (!userId || !token) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const tokenHash = await hashSecret(env, token, userId);
  const user = await env.DB.prepare(
    `SELECT u.id, u.email
     FROM auth_sessions s
     INNER JOIN user_profiles u ON u.id = s.user_id
     WHERE s.user_id = ? AND s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`
  )
    .bind(userId, tokenHash, nowIso())
    .first<{ id: string; email: string }>();
  if (!user) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const result = actorSchema.safeParse({
    userId: user.id,
    email: user.email,
  });
  if (!result.success) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return result.data;
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
    if (env.AUTH_DEBUG_OTP_LOGGING === "true") {
      console.info(`Clover OTP for ${email}: ${otp}`);
      return;
    }
    throw new Response("Email delivery is not configured", { status: 500 });
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

  const [user] = await Promise.all([
    getUserByEmail(env, normalizedEmail),
    assertRateLimit(env, normalizedEmail, "otp-send", 3, 60),
  ]);

  if (!user) return null;

  const otp = generateOtp();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OTP_MAX_AGE_SECONDS * 1000).toISOString();
  const otpHash = await hashSecret(env, otp, user.id);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_otps WHERE user_id = ?").bind(user.id),
    env.DB.prepare(
      `INSERT INTO auth_otps
        (id, user_id, email, otp_hash, attempts, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind(crypto.randomUUID(), user.id, normalizedEmail, otpHash, expiresAt, createdAt),
  ]);

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

  const [id] = await Promise.all([
    deriveOpaqueUuid(env, "pending-signup", normalizedEmail),
    assertRateLimit(env, normalizedEmail, "signup-otp-send", 3, 60),
  ]);
  const otp = generateOtp();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + OTP_MAX_AGE_SECONDS * 1000).toISOString();
  const otpHash = await hashSecret(env, otp, id);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM auth_signup_otps WHERE email = ?").bind(normalizedEmail),
    env.DB.prepare(
      `INSERT INTO auth_signup_otps
        (id, email, full_name, otp_hash, attempts, expires_at, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?)`
    ).bind(id, normalizedEmail, fullName, otpHash, expiresAt, createdAt),
  ]);

  await sendOtpEmail(env, normalizedEmail, otp);
  return id;
}

async function createSession(env: Env, userId: string) {
  const sessionId = crypto.randomUUID();
  const token = randomToken();
  const tokenHash = await hashSecret(env, token, userId);
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

export async function handleAuth(request: Request, env: Env, path: string) {
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
    const accountId = await sendEmailOtp(env, email, body.turnstileToken);
    return json({ accountId });
  }

  if (path === "/auth/verify") {
    const body = await parseBody(request, verifyOtpSchema);
    await assertRateLimit(env, body.accountId, "otp-verify", 5, 5 * 60);

    const signupOtp = await env.DB.prepare(
      `SELECT id, email, full_name, otp_hash, attempts, expires_at
       FROM auth_signup_otps
       WHERE id = ?
       LIMIT 1`
    )
      .bind(body.accountId)
      .first<PendingSignupOtpRow>();

    if (signupOtp) {
      if (new Date(signupOtp.expires_at).getTime() < Date.now()) {
        throw new Response("OTP expired", { status: 400 });
      }
      if (signupOtp.attempts >= 3) {
        throw new Response("Too many invalid attempts", { status: 429 });
      }

      const hash = await hashSecret(env, body.password, body.accountId);
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
            (id, email, full_name, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?)`
        )
          .bind(id, signupOtp.email, signupOtp.full_name, now, now)
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
    const hash = await hashSecret(env, body.password, body.accountId);
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
    const tokenHash = await hashSecret(env, token, userId);
    const user = await env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.created_at, u.updated_at
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
      const tokenHash = await hashSecret(env, token, userId);
      await env.DB.prepare("DELETE FROM auth_sessions WHERE user_id = ? AND token_hash = ?")
        .bind(userId, tokenHash)
        .run();
    }
    return json({ status: "success" });
  }

  return null;
}

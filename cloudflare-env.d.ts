/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  CLOVER_BACKEND_SECRET: string;
  AUTH_DEBUG_OTP_LOGGING?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
}

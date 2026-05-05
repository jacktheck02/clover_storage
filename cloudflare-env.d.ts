/// <reference types="@cloudflare/workers-types" />

interface CloudflareEnv {
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
}

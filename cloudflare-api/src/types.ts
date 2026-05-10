export type Env = {
  DB: D1Database;
  FILES_BUCKET: R2Bucket;
  BACKUPS_BUCKET: R2Bucket;
  CLOVER_BACKEND_SECRET: string;
  AUTH_HASH_PEPPER?: string;
  AUTH_DEBUG_OTP_LOGGING?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TURNSTILE_ENABLED?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export type D1Value = string | number | boolean | null;
export type FileType = "document" | "image" | "video" | "audio" | "other";

export type Actor = {
  userId: string;
  email: string;
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
  updated_at: string;
};

export type FileRow = {
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

export type PendingSignupOtpRow = {
  id: string;
  email: string;
  full_name: string;
  otp_hash: string;
  attempts: number;
  expires_at: string;
};

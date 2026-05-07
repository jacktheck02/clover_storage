CREATE TABLE IF NOT EXISTS auth_signup_otps (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_signup_otps_email_idx ON auth_signup_otps (email);
CREATE INDEX IF NOT EXISTS auth_signup_otps_expires_idx ON auth_signup_otps (expires_at);

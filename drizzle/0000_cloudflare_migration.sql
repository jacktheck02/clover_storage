CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  legacy_appwrite_user_doc_id TEXT,
  legacy_appwrite_account_id TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles (email);
CREATE INDEX IF NOT EXISTS user_profiles_legacy_account_idx ON user_profiles (legacy_appwrite_account_id);

CREATE TABLE IF NOT EXISTS user (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  emailVerified INTEGER NOT NULL DEFAULT 0,
  image TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS user_email_idx ON user (email);

CREATE TABLE IF NOT EXISTS session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt TEXT NOT NULL,
  token TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS session_token_idx ON session (token);
CREATE INDEX IF NOT EXISTS session_userId_idx ON session (userId);

CREATE TABLE IF NOT EXISTS account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  password TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS account_userId_idx ON account (userId);

CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS verification_identifier_idx ON verification (identifier);

CREATE TABLE IF NOT EXISTS auth_otps (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_otps_user_idx ON auth_otps (user_id);
CREATE INDEX IF NOT EXISTS auth_otps_email_idx ON auth_otps (email);
CREATE INDEX IF NOT EXISTS auth_otps_expires_idx ON auth_otps (expires_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS auth_sessions_token_idx ON auth_sessions (token_hash);
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_rate_limits (
  key TEXT NOT NULL,
  action TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, action, window_start)
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  r2_key TEXT NOT NULL,
  name TEXT NOT NULL,
  extension TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('document', 'image', 'video', 'audio', 'other')),
  size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  legacy_appwrite_file_doc_id TEXT,
  legacy_appwrite_bucket_file_id TEXT,
  legacy_appwrite_url TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS files_r2_key_idx ON files (r2_key);
CREATE INDEX IF NOT EXISTS files_owner_idx ON files (owner_id);
CREATE INDEX IF NOT EXISTS files_status_idx ON files (status);
CREATE INDEX IF NOT EXISTS files_type_idx ON files (type);
CREATE INDEX IF NOT EXISTS files_name_idx ON files (name);
CREATE INDEX IF NOT EXISTS files_created_at_idx ON files (created_at);
CREATE INDEX IF NOT EXISTS files_size_idx ON files (size);
CREATE INDEX IF NOT EXISTS files_legacy_doc_idx ON files (legacy_appwrite_file_doc_id);

CREATE TABLE IF NOT EXISTS file_shares (
  file_id TEXT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (file_id, email)
);

CREATE INDEX IF NOT EXISTS file_shares_email_idx ON file_shares (email);

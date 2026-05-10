PRAGMA foreign_keys=off;

CREATE TABLE user_profiles_next (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO user_profiles_next (id, email, full_name, created_at, updated_at)
SELECT id, email, full_name, created_at, updated_at
FROM user_profiles;

DROP TABLE user_profiles;
ALTER TABLE user_profiles_next RENAME TO user_profiles;

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx ON user_profiles (email);

PRAGMA foreign_keys=on;

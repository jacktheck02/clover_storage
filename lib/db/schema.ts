import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const userProfiles = sqliteTable(
  "user_profiles",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("user_profiles_email_idx").on(table.email),
  })
);

export const authOtps = sqliteTable(
  "auth_otps",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    otpHash: text("otp_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    userIdx: index("auth_otps_user_idx").on(table.userId),
    emailIdx: index("auth_otps_email_idx").on(table.email),
    expiresIdx: index("auth_otps_expires_idx").on(table.expiresAt),
  })
);

export const authSignupOtps = sqliteTable(
  "auth_signup_otps",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    otpHash: text("otp_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    emailIdx: index("auth_signup_otps_email_idx").on(table.email),
    expiresIdx: index("auth_signup_otps_expires_idx").on(table.expiresAt),
  })
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("auth_sessions_token_idx").on(table.tokenHash),
    userIdx: index("auth_sessions_user_idx").on(table.userId),
    expiresIdx: index("auth_sessions_expires_idx").on(table.expiresAt),
  })
);

export const authRateLimits = sqliteTable(
  "auth_rate_limits",
  {
    key: text("key").notNull(),
    action: text("action").notNull(),
    windowStart: integer("window_start").notNull(),
    count: integer("count").notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.key, table.action, table.windowStart],
    }),
  })
);

export const files = sqliteTable(
  "files",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    name: text("name").notNull(),
    extension: text("extension").notNull(),
    type: text("type").notNull(),
    size: integer("size").notNull(),
    mimeType: text("mime_type").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => ({
    ownerIdx: index("files_owner_idx").on(table.ownerId),
    statusIdx: index("files_status_idx").on(table.status),
    typeIdx: index("files_type_idx").on(table.type),
    nameIdx: index("files_name_idx").on(table.name),
    createdAtIdx: index("files_created_at_idx").on(table.createdAt),
    sizeIdx: index("files_size_idx").on(table.size),
    r2KeyIdx: uniqueIndex("files_r2_key_idx").on(table.r2Key),
  })
);

export const fileShares = sqliteTable(
  "file_shares",
  {
    fileId: text("file_id")
      .notNull()
      .references(() => files.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.fileId, table.email] }),
    emailIdx: index("file_shares_email_idx").on(table.email),
  })
);

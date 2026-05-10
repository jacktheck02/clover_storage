import { normalizeEmail } from "./http";
import type { Env, FileRow, UserRow } from "./types";

export function mapUser(user: UserRow) {
  return {
    $id: user.id,
    $createdAt: user.created_at,
    $updatedAt: user.updated_at,
    accountId: user.id,
    fullName: user.full_name,
    email: user.email,
  };
}

export function mapFile(file: FileRow) {
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
    mimeType: file.mime_type,
  };
}

export async function getUserByEmail(env: Env, email: string) {
  return env.DB.prepare(
    `SELECT id, email, full_name, created_at, updated_at
     FROM user_profiles
     WHERE email = ?`
  )
    .bind(normalizeEmail(email))
    .first<UserRow>();
}

export async function getUserById(env: Env, id: string) {
  return env.DB.prepare(
    `SELECT id, email, full_name, created_at, updated_at
     FROM user_profiles
     WHERE id = ?`
  )
    .bind(id)
    .first<UserRow>();
}

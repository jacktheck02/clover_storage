import { getActor } from "./auth";
import { bindAll, json, normalizeEmail, nowIso, parseBody } from "./http";
import {
  fileListSchema,
  fileMutationSchema,
  renameFileSchema,
  shareFileSchema,
} from "./schemas";
import { USER_STORAGE_LIMIT } from "./constants";
import { mapFile } from "./users";
import type { D1Value, Env, FileRow, FileType } from "./types";

export async function handleFiles(request: Request, env: Env, path: string) {
  if (path === "/files/list") {
    const actor = await getActor(request, env);
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
    const actor = await getActor(request, env);
    const body = await parseBody(request, renameFileSchema);
    await env.DB.prepare(
      `UPDATE files SET name = ?, updated_at = ? WHERE id = ? AND owner_id = ?`
    )
      .bind(`${body.name}.${body.extension}`, nowIso(), body.fileId, actor.userId)
      .run();
    return json({ status: "success" });
  }

  if (path === "/files/share") {
    const actor = await getActor(request, env);
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
    const actor = await getActor(request, env);
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
    const actor = await getActor(request, env);
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
      all: USER_STORAGE_LIMIT,
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

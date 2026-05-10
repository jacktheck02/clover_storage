import { getActor } from "./auth";
import { fileIdSchema } from "./schemas";
import { contentDisposition, isInlineSafeMimeType } from "./storage";
import type { Env } from "./types";

export async function handleFileObject(request: Request, env: Env, path: string) {
  const match = path.match(/^\/files\/([^/]+)\/(view|download)$/);
  if (!match) return null;
  const [, rawFileId, mode] = match;
  const fileIdResult = fileIdSchema.safeParse(rawFileId);
  if (!fileIdResult.success) throw new Response("Invalid file id", { status: 400 });
  const fileId = fileIdResult.data;
  const actor = await getActor(request, env);
  const file = await env.DB.prepare(
    `SELECT f.r2_key, f.name, f.mime_type
     FROM files f
     WHERE f.id = ?
       AND f.status = 'active'
       AND (
         f.owner_id = ?
         OR EXISTS (
           SELECT 1 FROM file_shares fs
           WHERE fs.file_id = f.id AND fs.email = ?
         )
       )`
  )
    .bind(fileId, actor.userId, actor.email)
    .first<{ r2_key: string; name: string; mime_type: string }>();
  if (!file) return new Response("Not found", { status: 404 });
  const rangeHeader = request.headers.get("range");
  const object = await env.FILES_BUCKET.get(
    file.r2_key,
    rangeHeader ? { range: request.headers } : undefined
  );
  if (!object) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  const inlineSafe = mode === "view" && isInlineSafeMimeType(file.mime_type);
  if (inlineSafe) {
    object.writeHttpMetadata(headers);
  }
  headers.set("content-type", inlineSafe ? file.mime_type : "application/octet-stream");
  headers.set("accept-ranges", "bytes");
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "no-referrer");
  headers.set("content-security-policy", "default-src 'none'; sandbox");

  let status = 200;
  const partialRange = (object as R2ObjectBody & { range?: { offset?: number; length?: number } }).range;
  if (partialRange?.offset !== undefined && partialRange?.length !== undefined) {
    const start = partialRange.offset;
    const end = start + partialRange.length - 1;
    headers.set("content-range", `bytes ${start}-${end}/${object.size}`);
    headers.set("content-length", String(partialRange.length));
    status = 206;
  }

  if (mode === "download" || !inlineSafe) {
    headers.set("content-disposition", contentDisposition("attachment", file.name));
  } else {
    headers.set("content-disposition", contentDisposition("inline", file.name));
    headers.set("cache-control", "private, max-age=60");
  }
  return new Response(object.body, { headers, status });
}

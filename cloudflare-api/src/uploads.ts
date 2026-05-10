import { getActor } from "./auth";
import { assertRateLimit } from "./rate-limit";
import { json, nowIso, parseBody } from "./http";
import { fileIdSchema, fileMutationSchema, uploadIntentSchema } from "./schemas";
import {
  buildR2Key,
  getCanonicalMimeType,
  getFileType,
  getReservedStorage,
  MAX_FILE_SIZE,
  rejectPendingUpload,
} from "./storage";
import { USER_STORAGE_LIMIT } from "./constants";
import type { Env } from "./types";

export async function handleUploads(request: Request, env: Env, path: string) {
  if (path === "/uploads/intent") {
    const actor = await getActor(request, env);
    const body = await parseBody(request, uploadIntentSchema);
    await assertRateLimit(env, actor.userId, "upload-intent", 30, 60);
    const reservedStorage = await getReservedStorage(env, actor.userId);
    if (reservedStorage + body.size > USER_STORAGE_LIMIT) {
      throw new Response("Storage quota exceeded", { status: 413 });
    }
    const fileId = crypto.randomUUID();
    const now = nowIso();
    const { type, extension } = getFileType(body.name);
    const r2Key = buildR2Key(actor.userId, fileId, body.name);
    const mimeType = getCanonicalMimeType(body.name);
    await env.DB.prepare(
      `INSERT INTO files
        (id, owner_id, r2_key, name, extension, type, size, mime_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(fileId, actor.userId, r2Key, body.name, extension, type, body.size, mimeType, now, now)
      .run();
    return json({
      fileId,
      uploadUrl: null,
      method: "PUT",
      directToR2: false,
    });
  }

  if (path === "/uploads/complete") {
    const actor = await getActor(request, env);
    const body = await parseBody(request, fileMutationSchema);
    const pending = await env.DB.prepare(
      `SELECT r2_key, size FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(body.fileId, actor.userId)
      .first<{ r2_key: string; size: number }>();
    if (!pending) throw new Response("Upload not found", { status: 404 });
    const object = await env.FILES_BUCKET.head(pending.r2_key);
    if (!object) throw new Response("Object was not uploaded", { status: 400 });
    if (object.size !== pending.size || object.size > MAX_FILE_SIZE) {
      await rejectPendingUpload(env, body.fileId, pending.r2_key);
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    const reservedStorage = await getReservedStorage(env, actor.userId);
    if (reservedStorage > USER_STORAGE_LIMIT) {
      await rejectPendingUpload(env, body.fileId, pending.r2_key);
      throw new Response("Storage quota exceeded", { status: 413 });
    }
    await env.DB.prepare(
      "UPDATE files SET status = 'active', updated_at = ? WHERE id = ? AND owner_id = ?"
    )
      .bind(nowIso(), body.fileId, actor.userId)
      .run();
    return json({ status: "success" });
  }

  const directMatch = path.match(/^\/uploads\/direct\/([^/]+)$/);
  if (directMatch && request.method === "PUT") {
    const fileIdResult = fileIdSchema.safeParse(directMatch[1]);
    if (!fileIdResult.success) throw new Response("Invalid file id", { status: 400 });
    const fileId = fileIdResult.data;
    const actor = await getActor(request, env);
    const file = await env.DB.prepare(
      `SELECT r2_key, mime_type, size FROM files WHERE id = ? AND owner_id = ? AND status = 'pending'`
    )
      .bind(fileId, actor.userId)
      .first<{ r2_key: string; mime_type: string; size: number }>();
    if (!file) throw new Response("Upload not found", { status: 404 });
    const contentLengthHeader = request.headers.get("content-length");
    const contentLength = Number(contentLengthHeader || 0);
    if (!contentLengthHeader || !Number.isFinite(contentLength) || contentLength <= 0) {
      throw new Response("Content-Length is required", { status: 411 });
    }
    if (contentLength !== file.size) {
      throw new Response(
        `Uploaded object size does not match the upload intent: received ${contentLength} bytes, expected ${file.size} bytes`,
        { status: 400 }
      );
    }
    const uploadBytes = await request.arrayBuffer();
    if (uploadBytes.byteLength !== file.size || uploadBytes.byteLength > MAX_FILE_SIZE) {
      await rejectPendingUpload(env, fileId, file.r2_key);
      throw new Response(
        `Uploaded object size does not match the upload intent: received ${uploadBytes.byteLength} bytes, expected ${file.size} bytes`,
        { status: 400 }
      );
    }
    try {
      await env.FILES_BUCKET.put(file.r2_key, uploadBytes, {
        httpMetadata: {
          contentType: file.mime_type,
        },
      });
    } catch (error) {
      await rejectPendingUpload(env, fileId, file.r2_key);
      if (error instanceof Response) throw error;
      throw new Response("Uploaded object size does not match the upload intent", {
        status: 400,
      });
    }
    const object = await env.FILES_BUCKET.head(file.r2_key);
    if (!object || object.size !== file.size || object.size > MAX_FILE_SIZE) {
      await rejectPendingUpload(env, fileId, file.r2_key);
      throw new Response(
        `Uploaded object size does not match the upload intent: stored ${object?.size ?? 0} bytes, expected ${file.size} bytes`,
        { status: 400 }
      );
    }
    return json({ status: "uploaded" });
  }

  return null;
}

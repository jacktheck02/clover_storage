import {
  dangerousInlineExtensions,
  inlineSafeMimeTypes,
  MAX_FILE_SIZE,
} from "./constants";
import type { Env } from "./types";

export function getExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function getCanonicalMimeType(fileName: string) {
  const extension = getExtension(fileName);
  if (!extension || dangerousInlineExtensions.has(extension)) {
    return "application/octet-stream";
  }

  const mimeByExtension: Record<string, string> = {
    bmp: "image/bmp",
    csv: "text/csv",
    flac: "audio/flac",
    gif: "image/gif",
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    m4a: "audio/mp4",
    md: "text/markdown",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    mp4: "video/mp4",
    ogg: "audio/ogg",
    pdf: "application/pdf",
    png: "image/png",
    txt: "text/plain",
    wav: "audio/wav",
    webm: "video/webm",
    webp: "image/webp",
  };

  return mimeByExtension[extension] || "application/octet-stream";
}

export function isInlineSafeMimeType(mimeType: string) {
  return inlineSafeMimeTypes.has(mimeType.split(";")[0].toLowerCase());
}

export function contentDisposition(disposition: "attachment" | "inline", fileName: string) {
  const fallback = fileName
    .replace(/[\r\n"]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 180) || "file";
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function getReservedStorage(env: Env, userId: string) {
  const result = await env.DB.prepare(
    `SELECT COALESCE(SUM(size), 0) AS used
     FROM files
     WHERE owner_id = ? AND status IN ('pending', 'active')`
  )
    .bind(userId)
    .first<{ used: number }>();
  return result?.used || 0;
}

export async function rejectPendingUpload(env: Env, fileId: string, r2Key: string) {
  await env.FILES_BUCKET.delete(r2Key);
  await env.DB.prepare("DELETE FROM files WHERE id = ? AND status = 'pending'")
    .bind(fileId)
    .run();
}

export function getFileType(fileName: string) {
  const extension = getExtension(fileName);
  const documents = [
    "pdf",
    "doc",
    "docx",
    "txt",
    "xls",
    "xlsx",
    "csv",
    "rtf",
    "ods",
    "ppt",
    "odp",
    "md",
    "html",
    "htm",
    "epub",
    "pages",
    "fig",
    "psd",
    "ai",
    "indd",
    "xd",
    "sketch",
    "afdesign",
    "afphoto",
  ];
  if (documents.includes(extension)) return { type: "document" as const, extension };
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) {
    return { type: "image" as const, extension };
  }
  if (["mp4", "avi", "mov", "mkv", "webm"].includes(extension)) {
    return { type: "video" as const, extension };
  }
  if (["mp3", "wav", "ogg", "flac"].includes(extension)) {
    return { type: "audio" as const, extension };
  }
  return { type: "other" as const, extension };
}

export function buildR2Key(userId: string, fileId: string, fileName: string) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/${userId}/files/${fileId}/${safeName}`;
}

export { MAX_FILE_SIZE };

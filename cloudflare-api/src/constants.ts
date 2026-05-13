import {
  MAX_FILE_SIZE_BYTES,
  MAX_JSON_BODY_BYTES,
  USER_STORAGE_LIMIT_BYTES,
} from "../../shared/storage-limits";

export const MAX_FILE_SIZE = MAX_FILE_SIZE_BYTES;
export const MAX_JSON_BODY_SIZE = MAX_JSON_BODY_BYTES;
export const USER_STORAGE_LIMIT = USER_STORAGE_LIMIT_BYTES;
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const OTP_MAX_AGE_SECONDS = 5 * 60;

export const fileTypeValues = [
  "document",
  "image",
  "video",
  "audio",
  "other",
] as const;

export const sortValues = [
  "$createdAt-desc",
  "$createdAt-asc",
  "name-desc",
  "name-asc",
  "size-desc",
  "size-asc",
] as const;

export const dangerousInlineExtensions = new Set([
  "css",
  "htm",
  "html",
  "js",
  "json",
  "mjs",
  "svg",
  "xhtml",
  "xml",
]);

export const inlineSafeMimeTypes = new Set([
  "application/pdf",
  "audio/flac",
  "audio/mpeg",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/markdown",
  "text/plain",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

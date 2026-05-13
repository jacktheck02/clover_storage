import { z } from "zod";

export const APP_PATHS = [
  "/",
  "/all",
  "/documents",
  "/images",
  "/media",
  "/others",
] as const;
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const MAX_JSON_BODY_BYTES = 16 * 1024;

export const fileTypeSchema = z.enum([
  "document",
  "image",
  "video",
  "audio",
  "other",
]);
const sortSchema = z
  .enum([
    "$createdAt-desc",
    "$createdAt-asc",
    "name-desc",
    "name-asc",
    "size-desc",
    "size-asc",
  ])
  .optional()
  .catch("$createdAt-desc")
  .default("$createdAt-desc");

export const getFilesSchema = z.object({
  types: z.array(fileTypeSchema).max(5).default([]),
  searchText: z.string().trim().max(100).default(""),
  sort: z
    .preprocess((value) => (value === "" ? undefined : value), sortSchema)
    .optional()
    .default("$createdAt-desc"),
  limit: z.number().int().min(1).max(100).optional(),
});

export const uploadIntentSchema = z.object({
  name: z.string().trim().min(1).max(255).regex(/^[^\r\n/\\]+$/),
  size: z.number().int().positive().max(MAX_FILE_SIZE_BYTES),
  type: z.string().trim().max(100).optional(),
});

export const fileIdBodySchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().max(100).optional(),
});
export const fileIdParamSchema = z.string().uuid();

export const renameFileSchema = z.object({
  fileId: z.string().uuid(),
  name: z.string().trim().min(1).max(180).regex(/^[^\r\n/\\]+$/),
  extension: z.string().trim().max(32).regex(/^[a-zA-Z0-9]*$/),
  path: z.string().max(100).optional(),
});

export const updateFileUsersSchema = z.object({
  fileId: z.string().uuid(),
  emails: z.array(z.string().trim().toLowerCase().email().max(254)).max(50),
  path: z.string().max(100).optional(),
});

export const deleteFileSchema = z.object({
  fileId: z.string().uuid(),
  path: z.string().max(100).optional(),
});

export function getActorHeaders(
  user: Pick<UserDocument, "$id" | "email">,
  session?: string
) {
  return {
    "x-clover-user-id": user.$id,
    "x-clover-user-email": user.email,
    ...(session ? { "x-clover-session": session } : {}),
  };
}

export function getSafeRevalidationPath(path?: string) {
  return APP_PATHS.find((allowedPath) => allowedPath === path);
}

export async function parseJsonRequest(request: Request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_JSON_BODY_BYTES) {
    throw new Response("Request body too large", { status: 413 });
  }

  if (!request.body) return {};

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_JSON_BODY_BYTES) {
      throw new Response("Request body too large", { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  if (!body.byteLength) return {};
  return JSON.parse(new TextDecoder().decode(body));
}

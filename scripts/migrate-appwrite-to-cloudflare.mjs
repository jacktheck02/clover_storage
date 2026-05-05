#!/usr/bin/env node
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { AwsClient } from "aws4fetch";

const required = [
  "APPWRITE_ENDPOINT",
  "APPWRITE_PROJECT_ID",
  "APPWRITE_API_KEY",
  "APPWRITE_DATABASE_ID",
  "APPWRITE_USERS_COLLECTION_ID",
  "APPWRITE_FILES_COLLECTION_ID",
  "APPWRITE_BUCKET_ID",
];

const dryRun = process.argv.includes("--dry-run");
const skipObjects = process.argv.includes("--skip-objects");
const outputDir = process.env.MIGRATION_OUTPUT_DIR || "migration-output";

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!dryRun && !skipObjects) {
  for (const key of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
  ]) {
    if (!process.env[key]) {
      console.error(`Missing required R2 environment variable: ${key}`);
      process.exit(1);
    }
  }
}

const endpoint = process.env.APPWRITE_ENDPOINT.replace(/\/$/, "");
const headers = {
  "X-Appwrite-Project": process.env.APPWRITE_PROJECT_ID,
  "X-Appwrite-Key": process.env.APPWRITE_API_KEY,
};

function sql(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function getFileType(fileName) {
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  const documents = new Set([
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
  ]);
  const images = new Set(["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"]);
  const videos = new Set(["mp4", "avi", "mov", "mkv", "webm"]);
  const audio = new Set(["mp3", "wav", "ogg", "flac"]);
  if (documents.has(extension)) return { type: "document", extension };
  if (images.has(extension)) return { type: "image", extension };
  if (videos.has(extension)) return { type: "video", extension };
  if (audio.has(extension)) return { type: "audio", extension };
  return { type: "other", extension };
}

async function appwriteGet(path) {
  const response = await fetch(`${endpoint}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  }
  return response.json();
}

async function listDocuments(collectionId) {
  const documents = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const params = new URLSearchParams({
      "queries[0]": JSON.stringify({ method: "limit", values: [limit] }),
      "queries[1]": JSON.stringify({ method: "offset", values: [offset] }),
    });
    const page = await appwriteGet(
      `/databases/${process.env.APPWRITE_DATABASE_ID}/collections/${collectionId}/documents?${params}`
    );
    documents.push(...page.documents);
    if (page.documents.length < limit) break;
    offset += limit;
  }

  return documents;
}

async function getAppwriteFile(bucketFileId) {
  const response = await fetch(
    `${endpoint}/storage/buckets/${process.env.APPWRITE_BUCKET_ID}/files/${bucketFileId}/download`,
    { headers }
  );
  if (!response.ok) {
    throw new Error(`Failed to download ${bucketFileId}: ${response.status}`);
  }
  return response.arrayBuffer();
}

async function putR2Object(key, body, contentType) {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${key}`;
  const signed = await client.sign(
    new Request(url, {
      method: "PUT",
      body,
      headers: contentType ? { "content-type": contentType } : undefined,
    }),
    { aws: { signQuery: false } }
  );
  const response = await fetch(signed);
  if (!response.ok) {
    throw new Error(`Failed to upload ${key}: ${response.status} ${await response.text()}`);
  }
}

function r2KeyFor(userId, fileId, fileName) {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/${userId}/files/${fileId}/${safeName}`;
}

await mkdir(outputDir, { recursive: true });

console.info("Exporting Appwrite users...");
const users = await listDocuments(process.env.APPWRITE_USERS_COLLECTION_ID);
const usersByLegacyId = new Map(users.map((user) => [user.$id, user]));
const userSql = [];

for (const user of users) {
  const id = user.$id;
  userSql.push(
    `INSERT INTO user_profiles (id, email, full_name, avatar_url, created_at, updated_at, legacy_appwrite_user_doc_id, legacy_appwrite_account_id) VALUES (${[
      sql(id),
      sql(String(user.email || "").toLowerCase()),
      sql(user.fullName || ""),
      sql(user.avatar || ""),
      sql(user.$createdAt),
      sql(user.$updatedAt),
      sql(user.$id),
      sql(user.accountId),
    ].join(", ")}) ON CONFLICT(id) DO UPDATE SET email = excluded.email, full_name = excluded.full_name, avatar_url = excluded.avatar_url, updated_at = excluded.updated_at;`
  );
}

console.info("Exporting Appwrite files...");
const files = await listDocuments(process.env.APPWRITE_FILES_COLLECTION_ID);
const fileSql = [];
let objectCount = 0;
let totalBytes = 0;

for (const file of files) {
  const owner = usersByLegacyId.get(file.owner);
  if (!owner) {
    console.warn(`Skipping ${file.$id}: owner ${file.owner} missing`);
    continue;
  }

  const { type, extension } = getFileType(file.name);
  const r2Key = r2KeyFor(file.owner, file.$id, file.name);
  const mimeType = file.mimeType || "application/octet-stream";
  totalBytes += Number(file.size || 0);

  if (!dryRun && !skipObjects) {
    const object = await getAppwriteFile(file.bucketFileId);
    await putR2Object(r2Key, object, mimeType);
    objectCount += 1;
  }

  fileSql.push(
    `INSERT INTO files (id, owner_id, r2_key, name, extension, type, size, mime_type, status, created_at, updated_at, legacy_appwrite_file_doc_id, legacy_appwrite_bucket_file_id, legacy_appwrite_url) VALUES (${[
      sql(file.$id),
      sql(file.owner),
      sql(r2Key),
      sql(file.name),
      sql(extension),
      sql(type),
      sql(Number(file.size || 0)),
      sql(mimeType),
      sql("active"),
      sql(file.$createdAt),
      sql(file.$updatedAt),
      sql(file.$id),
      sql(file.bucketFileId),
      sql(file.url),
    ].join(", ")}) ON CONFLICT(id) DO UPDATE SET name = excluded.name, size = excluded.size, updated_at = excluded.updated_at;`
  );

  for (const email of file.users || []) {
    fileSql.push(
      `INSERT OR IGNORE INTO file_shares (file_id, email, created_at) VALUES (${sql(
        file.$id
      )}, ${sql(String(email).toLowerCase())}, ${sql(file.$updatedAt)});`
    );
  }
}

const outputPath = join(outputDir, "appwrite-import.sql");
await writeFile(outputPath, [...userSql, ...fileSql].join("\n") + "\n");

console.info(
  JSON.stringify(
    {
      dryRun,
      skipObjects,
      users: users.length,
      files: files.length,
      objectsUploaded: objectCount,
      totalBytes,
      sqlOutput: outputPath,
    },
    null,
    2
  )
);

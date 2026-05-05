#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { AwsClient } from "aws4fetch";

const database = process.env.CLOVER_D1_DATABASE || "clover-db";
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const output = `clover-d1-${timestamp}.sql`;

function requireEnv(key) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

for (const key of [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "BACKUPS_R2_BUCKET_NAME",
]) {
  requireEnv(key);
}

const exportResult = spawnSync(
  "npx",
  ["wrangler", "d1", "export", database, "--remote", "--output", output],
  { stdio: "inherit" }
);

if (exportResult.status !== 0) {
  process.exit(exportResult.status ?? 1);
}

const body = await readFile(output);
const client = new AwsClient({
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const key = `d1/${database}/${output}`;
const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.BACKUPS_R2_BUCKET_NAME}/${key}`;
const signed = await client.sign(
  new Request(url, {
    method: "PUT",
    body,
    headers: { "content-type": "application/sql" },
  })
);
const response = await fetch(signed);

if (!response.ok) {
  console.error(`Failed to upload backup: ${response.status} ${await response.text()}`);
  process.exit(1);
}

await unlink(output).catch(() => undefined);
console.info(`Uploaded D1 backup to r2://${process.env.BACKUPS_R2_BUCKET_NAME}/${key}`);

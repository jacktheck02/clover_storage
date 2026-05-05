#!/usr/bin/env node
import { AwsClient } from "aws4fetch";

const database = process.env.CLOVER_D1_DATABASE || "clover-db";
const olderThanMinutes = Number(process.env.PENDING_UPLOAD_MAX_AGE_MINUTES || 60);
const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000).toISOString();

for (const key of [
  "CLOUDFLARE_ACCOUNT_ID",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_DATABASE_ID",
]) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const sql = `SELECT id, r2_key FROM files WHERE status = 'pending' AND created_at < '${cutoff.replaceAll("'", "''")}'`;
const d1Url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${process.env.CLOUDFLARE_DATABASE_ID}/query`;

const queryResponse = await fetch(d1Url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ sql }),
});

if (!queryResponse.ok) {
  console.error(`Failed to query pending uploads: ${await queryResponse.text()}`);
  process.exit(1);
}

const queryJson = await queryResponse.json();
const rows = queryJson.result?.[0]?.results || [];

if (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME) {
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });

  for (const row of rows) {
    const url = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${row.r2_key}`;
    const signed = await client.sign(new Request(url, { method: "DELETE" }));
    await fetch(signed);
  }
}

const deleteSql = `DELETE FROM files WHERE status = 'pending' AND created_at < '${cutoff.replaceAll("'", "''")}'`;
const deleteResponse = await fetch(d1Url, {
  method: "POST",
  headers: {
    authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
    "content-type": "application/json",
  },
  body: JSON.stringify({ sql: deleteSql }),
});

if (!deleteResponse.ok) {
  console.error(`Failed to delete pending upload rows: ${await deleteResponse.text()}`);
  process.exit(1);
}

console.info(`Deleted ${rows.length} stale pending uploads from ${database}.`);

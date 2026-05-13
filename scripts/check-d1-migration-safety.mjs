#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "drizzle");
const legacyBetterAuthDropMigration = "0003_drop_legacy_better_auth_tables.sql";
const legacyBetterAuthTables = new Set([
  "account",
  "session",
  "verification",
  "user",
]);

const statementPatterns = [
  {
    pattern: /\bPRAGMA\s+foreign_keys\s*=\s*off\b/i,
    message:
      "disables foreign-key enforcement. This can hide cascaded deletes during table rebuilds.",
  },
  {
    pattern: /\bDROP\s+TABLE\b/i,
    kind: "drop-table",
    message:
      "drops a table. Rebuilding parent tables can cascade-delete child rows in D1.",
  },
  {
    pattern: /\bDELETE\s+FROM\s+(user_profiles|files|file_shares|auth_sessions|auth_otps)\b/i,
    message: "deletes from an app data table without a WHERE clause.",
    requireMissingWhere: true,
  },
];

const protectedTableRebuildPatterns = [
  /\bALTER\s+TABLE\s+user_profiles\s+RENAME\s+TO\b/i,
  /\bALTER\s+TABLE\s+files\s+RENAME\s+TO\b/i,
  /\bCREATE\s+TABLE\s+user_profiles_next\b/i,
  /\bCREATE\s+TABLE\s+files_next\b/i,
];

function stripSqlComments(sql) {
  return sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function splitStatements(sql) {
  return sql
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);
}

function isAllowedLegacyBetterAuthDrop(fileName, statement) {
  if (fileName !== legacyBetterAuthDropMigration) return false;
  const match = statement.match(/^DROP\s+TABLE\s+IF\s+EXISTS\s+["`[]?([A-Za-z_][\w]*)["`\]]?$/i);
  return Boolean(match && legacyBetterAuthTables.has(match[1].toLowerCase()));
}

const entries = await readdir(migrationsDir, { withFileTypes: true });
const migrationFiles = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
  .map((entry) => entry.name)
  .sort();

const failures = [];

for (const fileName of migrationFiles) {
  const sql = stripSqlComments(
    await readFile(join(migrationsDir, fileName), "utf8")
  );

  for (const statement of splitStatements(sql)) {
    for (const { pattern, message, requireMissingWhere, kind } of statementPatterns) {
      if (!pattern.test(statement)) continue;
      if (kind === "drop-table" && isAllowedLegacyBetterAuthDrop(fileName, statement)) {
        continue;
      }
      if (requireMissingWhere && /\bWHERE\b/i.test(statement)) continue;
      failures.push(`${fileName}: ${message}`);
    }
  }

  for (const pattern of protectedTableRebuildPatterns) {
    if (pattern.test(sql)) {
      failures.push(
        `${fileName}: attempts to rebuild a protected table. Use ALTER TABLE for additive/drop-column changes, or write a reviewed data-preserving migration.`
      );
    }
  }
}

if (failures.length > 0) {
  console.error("Unsafe D1 migration detected:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "If a destructive migration is truly required, create a one-off runbook with a verified backup and do not route it through the standard migration scripts."
  );
  process.exit(1);
}

console.info(`Checked ${migrationFiles.length} D1 migration(s): safe.`);

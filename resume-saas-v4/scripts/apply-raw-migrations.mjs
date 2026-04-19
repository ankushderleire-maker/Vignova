#!/usr/bin/env node
/**
 * apply-raw-migrations.mjs
 * ------------------------------------------------------------
 * Cross-platform applier for raw .sql files in prisma/migrations/.
 * These are tables that live outside schema.prisma (admin_scan_settings,
 * user_cooldown_overrides, onboarding columns, etc) and are queried
 * via $queryRawUnsafe. Prisma's own migrate flow ignores them, so in
 * Docker start.sh applies them via `prisma db execute`. This script
 * does the same thing but works on Windows, macOS and Linux, so
 * `npm run db:migrate:raw` can be used anywhere.
 *
 * Usage:
 *   npm run db:migrate:raw
 *
 * All .sql files in prisma/migrations/ are run in lexicographic order.
 * Each file must be written so re-running it is a no-op
 * (CREATE TABLE IF NOT EXISTS, ALTER ... ADD COLUMN IF NOT EXISTS, etc).
 */

import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";

const MIGRATIONS_DIR = resolve(process.cwd(), "prisma", "migrations");
const SCHEMA_PATH = resolve(process.cwd(), "prisma", "schema.prisma");

async function main() {
  let entries;
  try {
    entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  } catch (err) {
    console.error(`cannot read ${MIGRATIONS_DIR}:`, err.message);
    process.exit(1);
  }

  const sqlFiles = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
    .map((e) => e.name)
    .sort();

  if (sqlFiles.length === 0) {
    console.log("No raw .sql files in prisma/migrations/ — nothing to do.");
    return;
  }

  console.log(`Applying ${sqlFiles.length} raw SQL migration(s)...`);
  let failures = 0;

  for (const name of sqlFiles) {
    const full = join(MIGRATIONS_DIR, name);
    console.log(`  → ${name}`);
    const res = spawnSync(
      "npx",
      [
        "prisma@6",
        "db",
        "execute",
        "--file",
        full,
        "--schema",
        SCHEMA_PATH,
      ],
      { stdio: "inherit", shell: process.platform === "win32" },
    );
    if (res.status !== 0) {
      failures += 1;
      console.error(`    ! failed (exit ${res.status}) — continuing`);
    }
  }

  if (failures > 0) {
    console.error(`\nDone with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log("\nAll raw SQL migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

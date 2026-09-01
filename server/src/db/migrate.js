'use strict';
/**
 * Migration runner — versioned SQL files.
 *
 * فایل‌های migrations/*.sql به‌ترتیب lexicographic اجرا می‌شوند و
 * نام هرکدام در جدول schema_migrations ثبت می‌شود. هر migration در یک
 * transaction اجرا می‌شود؛ خطا → rollback کامل آن migration.
 *
 * چرا drizzle-kit مستقیم؟ ما schema را با Drizzle تعریف می‌کنیم (types + queries)
 * ولی migrationهای handwritten، reviewable و بدون نیاز به pipeline generate
 * — سبک‌تر و قابل اطمینان‌تر برای این اندازه پروژه.
 */
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('../db/client');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

async function ensureMigrationsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedMigrations(client = pool) {
  await ensureMigrationsTable(client);
  const { rows } = await client.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((r) => r.name));
}

function listMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

/**
 * اجرای pending migrations.
 * @returns {string[]} نام migrationهایی که اجرا شدند
 */
async function migrate({ silent = false } = {}) {
  const files = listMigrationFiles();
  const applied = await appliedMigrations();
  const pending = files.filter((f) => !applied.has(f));

  for (const file of pending) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      await client.query('COMMIT');
      if (!silent) console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw new Error(`migration "${file}" failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  if (!silent) console.log(`[migrate] done. ${files.length} total, ${files.length - pending.length} applied before.`);
  return pending;
}

module.exports = { migrate, listMigrationFiles, appliedMigrations };

#!/usr/bin/env node
'use strict';
/**
 * scripts/migrate.js — اجرای versioned migrations
 *   node scripts/migrate.js            → apply pending
 *   node scripts/migrate.js --status   → وضعیت
 */
require('../src/config'); // env load
const { migrate, listMigrationFiles, appliedMigrations } = require('../src/db/migrate');
const { pool } = require('../src/db/client');

(async () => {
  try {
    if (process.argv.includes('--status')) {
      const files = listMigrationFiles();
      const applied = await appliedMigrations();
      for (const f of files) {
        console.log(`${applied.has(f) ? '✓' : '✗ (pending)'}  ${f}`);
      }
      await pool.end();
      return;
    }
    const pending = await migrate();
    if (!pending.length) console.log('[migrate] all migrations already applied');
    await pool.end();
  } catch (err) {
    console.error('[migrate] FAILED:', err.message);
    process.exitCode = 1;
  }
})();

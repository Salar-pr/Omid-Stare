#!/usr/bin/env node
'use strict';
/**
 * scripts/create-admin.js — bootstrap یک admin (بدون hard-code credentials)
 *
 *   npm run create-admin -- --email admin@x.com --password 'Xx123456'
 * یا از env: ADMIN_EMAIL / ADMIN_PASSWORD
 */
const argon2 = require('argon2');
const config = require('../src/config');
const { pool } = require('../src/db/client');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

(async () => {
  const email = (arg('email') || config.adminEmail || '').trim().toLowerCase();
  const password = arg('password') || config.adminPassword || '';
  if (!email || !password) {
    console.error('کاربرد: npm run create-admin -- --email you@x.com --password StrongPass1');
    console.error('یا ADMIN_EMAIL/ADMIN_PASSWORD را در .env بگذار.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('رمز باید حداقل ۸ کاراکتر باشد.');
    process.exit(1);
  }
  const hash = await argon2.hash(password, { type: argon2.argon2id });
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin', $1, $2, 'admin')
     ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = TRUE, updated_at = now()
     RETURNING id, email, role`,
    [email, hash]
  );
  console.log(`admin ok → ${rows[0].email} (role=${rows[0].role})`);
  await pool.end();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});

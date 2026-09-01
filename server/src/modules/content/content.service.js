'use strict';
/**
 * content.service — mini CMS: site_content (key → jsonb)
 * فقط چیزی که واقعاً نیاز به مدیریت دارد این‌جاست (قانون §31).
 */
const { pool } = require('../../db/client');
const { ValidationError } = require('../../utils/errors');
const { z } = require('zod');

const KEYS = ['hero', 'manifest', 'contact_info', 'socials', 'featured', 'welcome_albums', 'footer_note'];

async function getAllPublic() {
  const { rows } = await pool.query('SELECT key, value FROM site_content');
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function getPublic(key) {
  if (!KEYS.includes(key)) return null;
  const { rows } = await pool.query('SELECT value FROM site_content WHERE key = $1', [key]);
  return rows[0] ? rows[0].value : null;
}

async function set(key, value) {
  if (!KEYS.includes(key)) throw new ValidationError('کلید محتوا معتبر نیست.');
  const isObj = typeof value === 'object' && value !== null && !Array.isArray(value);
  const isStr = typeof value === 'string';
  if (!isObj && !isStr) {
    throw new ValidationError('محتوا باید یک آبجکت JSON یا رشته باشد.');
  }
  // سبک validate: اعداد/رشته‌های خیلی بلند و عمق زیاد نروند توی DB
  const json = JSON.stringify(value);
  if (json.length > 20000) throw new ValidationError('محتوا خیلی بزرگە.');
  await pool.query(
    `INSERT INTO site_content (key, value, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, json]
  );
  const { rows } = await pool.query('SELECT value FROM site_content WHERE key = $1', [key]);
  return rows[0].value;
}

module.exports = { KEYS, getAllPublic, getPublic, set };

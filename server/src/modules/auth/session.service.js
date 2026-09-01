'use strict';
/**
 * session.service — DB-backed sessions با opaque token.
 *
 * - token خام (random 256-bit) توی cookie می‌رود (HttpOnly).
 * - در DB فقط sha256(token) ذخیره می‌شود → اگر DB دزدیده شود sessionها جعل نمی‌شوند.
 * - Logout = حذف سطر → revoke فوری server-side (برتری نسبت به stateless JWT).
 */
const crypto = require('node:crypto');
const { pool, db } = require('../../db/client');
const { sessions, users } = require('../../db/schema');
const { eq, and, gt } = require('drizzle-orm');
const config = require('../../config');
const { AuthError } = require('../../utils/errors');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createSession(userId, req) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86400 * 1000);
  await pool.query(
    'INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at) VALUES ($1,$2,$3,$4,$5)',
    [userId, sha256(token), (req.headers['user-agent'] || '').slice(0, 256), req.ip, expiresAt]
  );
  return { token, expiresAt };
}

/** token → user فعال (یا null) */
async function userByToken(token) {
  if (!token) return null;
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.role, u.is_active, u.created_at, u.last_login_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.is_active = TRUE`,
    [sha256(token)]
  );
  return rows[0] || null;
}

async function destroySession(token) {
  if (!token) return;
  await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
}

/** cookie options یکدست برای همه middlewareها */
function cookieOptions(expiresAt) {
  return {
    path: '/',
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.sameSite,
    expires: expiresAt,
  };
}

module.exports = {
  createSession,
  userByToken,
  destroySession,
  cookieOptions,
  sha256,
  config,
};

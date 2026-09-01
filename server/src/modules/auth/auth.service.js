'use strict';
/**
 * auth.service — register / login / logout / me.
 * - Argon2id برای hash (سرعت و memory-hardness مناسب برای brute-force).
 * - پیام خطای login همیشه generic است (فاش نمی‌کند ایمیل وجود دارد یا نه).
 */
const argon2 = require('argon2');
const { pool } = require('../../db/client');
const sessionService = require('./session.service');
const { ValidationError, AuthError, ConflictError } = require('../../utils/errors');
const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'اسمت خیلی کوتاهه').max(80, 'اسمت خیلی بلندە'),
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست').max(190),
  password: z
    .string()
    .min(8, 'رمز حداقل ۸ کاراکتر باشه')
    .max(128, 'رمز خیلی بلندە')
    .regex(/[a-zA-Z]/, 'رمز باید حروف انگلیسی هم داشته باشه')
    .regex(/\d/, 'رمز باید عدد هم داشته باشه'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('ایمیل معتبر نیست'),
  password: z.string().min(1, 'رمز رو بزن!'),
});

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    role: row.role,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

async function register(input, req) {
  const data = registerSchema.parse(input);

  const { rows } = await pool.query('SELECT id, is_active FROM users WHERE email = $1', [data.email]);
  if (rows.length) {
    throw new ConflictError('این ایمیل قبلا ثبت شده — از تب ورود استفاده کن.', 'EMAIL_TAKEN');
  }

  const hash = await argon2.hash(data.password, { type: argon2.argon2id });
  const { rows: inserted } = await pool.query(
    `INSERT INTO users (name, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, avatar_url, role, is_active, created_at, last_login_at`,
    [data.name, data.email, hash]
  );

  const session = await sessionService.createSession(inserted[0].id, req);
  return { user: publicUser(inserted[0]), session };
}

async function login(input, req, log) {
  const data = loginSchema.parse(input);

  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1',
    [data.email]
  );
  const user = rows[0];

  // همیشه hash verify می‌کنیم (حتی برای ایمیل ناشناخته) تا timing leak نداشته باشیم
  const hashForCheck =
    user && user.password_hash
      ? user.password_hash
      : '$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$AAAAAAAAAAAAAAAAAAAAAAAAAAA';

  let ok = false;
  try {
    ok = await argon2.verify(hashForCheck, data.password);
  } catch (e) {
    ok = false;
  }

  if (!user || !ok || !user.is_active) {
    if (log) log.warn({ email: data.email, ip: req.ip }, 'auth: login failed');
    throw new AuthError('ایمیل یا رمز اشتباهه!');
  }

  await pool.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);
  const session = await sessionService.createSession(user.id, req);
  return { user: publicUser(user), session };
}

async function logout(req) {
  await sessionService.destroySession(req.sessionToken);
}

async function me(req) {
  return publicUser(req.user);
}

module.exports = { register, login, logout, me, publicUser };

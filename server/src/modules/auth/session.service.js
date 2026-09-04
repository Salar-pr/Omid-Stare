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

/**
 * پاک‌سازی دوره‌ای sessionهای منقضی — وگرنه جدول برای همیشه بزرگ می‌شود.
 * حداکثر یک‌بار در ساعت اجرا می‌شود (fire-and-forget، هیچ مسیری را بلاک نمی‌کند).
 */
let lastCleanupAt = 0;
function maybeCleanupExpired() {
  const now = Date.now();
  if (now - lastCleanupAt < 3600 * 1000) return;
  lastCleanupAt = now;
  pool
    .query("DELETE FROM sessions WHERE expires_at < now() - interval '1 day'")
    .catch(() => {});
}

async function createSession(userId, req) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 86400 * 1000);
  await pool.query(
    'INSERT INTO sessions (user_id, token_hash, user_agent, ip, expires_at) VALUES ($1,$2,$3,$4,$5)',
    [userId, sha256(token), (req.headers['user-agent'] || '').slice(0, 256), req.ip, expiresAt]
  );
  maybeCleanupExpired();
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

/**
 * cookie options یکدست برای همه middlewareها.
 *
 * @param expiresAt تاریخ انقضای سشن
 * @param req       درخواست (اختیاری) — برای تشخیص اینکه سایت داخل iframe
 *                  یک دامنه‌ی دیگر باز شده یا نه.
 *
 * چرا req لازم است؟
 *   وقتی صفحه داخل iframe یک دامنه‌ی دیگر است (محیط پیش‌نمایش/دمو)، مرورگر
 *   کوکی SameSite=Lax را در آن context نمی‌فرستد. نتیجه: کاربر وارد می‌شود،
 *   ولی درخواست بعدی بدون کوکی می‌رود و دوباره به صفحه‌ی ورود پرت می‌شود.
 *   در این حالت باید SameSite=None بدهیم — که مرورگر فقط همراه Secure می‌پذیرد.
 *   روی HTTP ساده (localhost) None+Secure کار نمی‌کند، پس آنجا Lax می‌ماند.
 */
function cookieOptions(expiresAt, req) {
  const opts = {
    path: '/',
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.sameSite,
    expires: expiresAt,
  };

  if (!config.allowEmbedding || !req) return opts;

  // نکته‌ی مهم: نمی‌توان با هدر Origin تشخیص داد که صفحه داخل iframe است یا نه.
  // درخواست fetch از داخل خود فریم می‌آید، پس Origin دقیقاً برابر host است و
  // «cross-site» به نظر نمی‌رسد — در حالی که مرورگر کوکی را third-party حساب
  // می‌کند (چون صفحه‌ی سطح‌بالا دامنه‌ی دیگری است) و با Lax آن را نمی‌فرستد.
  //
  // بنابراین وقتی جاسازی مجاز است، روی HTTPS همیشه SameSite=None می‌دهیم.
  // (روی HTTP ساده ممکن نیست: مرورگر None را فقط با Secure می‌پذیرد و
  //  Secure روی http کار نمی‌کند — آنجا Lax می‌ماند که برای localhost کافی است.)
  const h = (req.headers || {});
  const proto = h['x-forwarded-proto'] || req.protocol || 'http';
  let isHttps = String(proto).split(',')[0].trim() === 'https';

  // بعضی پراکسی‌های پیش‌نمایش (مثل *.arena.site) هدر x-forwarded-proto
  // نمی‌فرستند. در آن حالت اتکا به آن هدر باعث می‌شود کوکی Lax بماند و
  // در iframe اصلاً ذخیره نشود. پس اگر میزبان درخواست یک آدرس محلی نیست،
  // یعنی از طریق یک پراکسی عمومی آمده‌ایم و آن پراکسی حتماً HTTPS است.
  if (!isHttps) {
    const host = String(h['x-forwarded-host'] || h.host || '').split(':')[0];
    const isLocal =
      host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
    if (!isLocal) isHttps = true;
  }

  if (isHttps) {
    opts.sameSite = 'none';
    opts.secure = true; // الزام مرورگر برای SameSite=None
  }

  return opts;
}

module.exports = {
  createSession,
  userByToken,
  destroySession,
  cookieOptions,
  sha256,
  config,
};

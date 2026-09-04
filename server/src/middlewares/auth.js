'use strict';
/**
 * middlewares/auth — authenticate + requireAdmin.
 *
 * authenticate:  cookie sid → session → user فعال → req.user
 * requireAdmin:  authenticate + role='admin' (authenticated بودن کافی نیست!)
 */
const sessionService = require('../modules/auth/session.service');
const config = require('../config');
const { AuthError, ForbiddenError } = require('../utils/errors');

/**
 * توکن سشن را از کوکی می‌خواند؛ اگر نبود از هدر Authorization: Bearer.
 *
 * چرا fallback لازم است؟
 *   وقتی سایت داخل iframe یک دامنه‌ی دیگر باز می‌شود (محیط پیش‌نمایش/دمو)،
 *   مرورگر ممکن است کوکی را اصلاً ذخیره نکند — مثلاً وقتی iframe بدون
 *   allow-same-origin در sandbox است و صفحه در «مبدأ مات» اجرا می‌شود، یا
 *   وقتی مرورگر کوکی‌های third-party را بلاک کرده است. در آن حالت هیچ تنظیم
 *   SameSite کمکی نمی‌کند و کاربر بعد از ورود دوباره به صفحه‌ی ورود پرت می‌شود.
 *   با پذیرفتن Bearer، فرانت می‌تواند توکن را در localStorage نگه دارد.
 *
 * امنیت: کوکی همچنان مسیر اصلی و ترجیحی است (HttpOnly، مصون از XSS).
 * Bearer فقط وقتی استفاده می‌شود که کوکی وجود نداشته باشد.
 */
function extractToken(req) {
  const fromCookie = req.cookies ? req.cookies[config.cookieName] : null;
  if (fromCookie) return fromCookie;

  const auth = req.headers && req.headers.authorization;
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim() || null;
  }
  return null;
}

async function authenticate(req, reply) {
  const token = extractToken(req);
  const user = await sessionService.userByToken(token);
  if (!user) {
    throw new AuthError('برای این کار باید وارد حساب بشی.');
  }
  req.user = user;
  req.sessionToken = token;
}

async function requireAdmin(req, reply) {
  await authenticate(req, reply);
  if (req.user.role !== 'admin' || !req.user.is_active) {
    throw new ForbiddenError('فقط مدیر می‌تواند این کار را انجام دهد.');
  }
}

module.exports = { authenticate, requireAdmin, extractToken };

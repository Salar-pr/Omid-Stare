'use strict';
/**
 * auth.routes — POST /register /login /logout, GET /me
 * rate-limit سخت روی register/login (brute-force protection).
 */
const config = require('../../config');
const sessionService = require('./session.service');
const authService = require('./auth.service');
const { ok, created, fail } = require('../../utils/respond');
const { AuthError } = require('../../utils/errors');
const { authenticate } = require('../../middlewares/auth');

/**
 * وقتی جاسازی در iframe مجاز است، توکن سشن را کنار اطلاعات کاربر برمی‌گردانیم.
 * دلیل: در iframe بین‌دامنه‌ای مرورگر ممکن است کوکی را ذخیره نکند؛ آن‌وقت فرانت
 * توکن را نگه می‌دارد و به‌صورت Authorization: Bearer می‌فرستد.
 * در production (allowEmbedding=false) هیچ توکنی در بدنه برنمی‌گردد و فقط
 * کوکی HttpOnly معتبر است — یعنی سطح حمله‌ی XSS بیشتر نمی‌شود.
 */
function withToken(user, session) {
  if (!config.allowEmbedding) return user;
  return { ...user, sessionToken: session.token };
}

async function authRoutes(app) {
  const rlAuth = {
    config: { rateLimit: { max: config.rateLimit.auth, timeWindow: '15 minutes' } },
  };

  app.post('/auth/register', rlAuth, async (req, reply) => {
    try {
      const { user, session } = await authService.register(req.body || {}, req);
      reply.cookie(config.cookieName, session.token, sessionService.cookieOptions(session.expiresAt, req));
      // sessionToken فقط وقتی برگردانده می‌شود که جاسازی در iframe مجاز است
      // (محیط پیش‌نمایش) — فرانت اگر کوکی کار نکرد از آن به‌عنوان Bearer استفاده می‌کند.
      return created(reply, withToken(user, session), `به ووید خوش اومدی، ${user.name}! 🌀`);
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/auth/login', rlAuth, async (req, reply) => {
    try {
      const { user, session } = await authService.login(req.body || {}, req, req.log);
      reply.cookie(config.cookieName, session.token, sessionService.cookieOptions(session.expiresAt, req));
      return ok(reply, withToken(user, session), `خوش برگشتی، ${user.name}! 👁️`);
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/auth/logout', { preHandler: [authenticate] }, async (req, reply) => {
    await authService.logout(req);
    reply.clearCookie(config.cookieName, { path: '/' });
    return ok(reply, null, 'از ووید خارج شدی. پرتال همیشه بازه 🌀');
  });

  app.get('/auth/me', { preHandler: [authenticate] }, async (req, reply) => {
    return ok(reply, await authService.me(req));
  });
}

module.exports = authRoutes;

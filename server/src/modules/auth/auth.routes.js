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

async function authRoutes(app) {
  const rlAuth = {
    config: { rateLimit: { max: config.rateLimit.auth, timeWindow: '15 minutes' } },
  };

  app.post('/auth/register', rlAuth, async (req, reply) => {
    try {
      const { user, session } = await authService.register(req.body || {}, req);
      reply.cookie(config.cookieName, session.token, sessionService.cookieOptions(session.expiresAt, req));
      return created(reply, user, `به ووید خوش اومدی، ${user.name}! 🌀`);
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/auth/login', rlAuth, async (req, reply) => {
    try {
      const { user, session } = await authService.login(req.body || {}, req, req.log);
      reply.cookie(config.cookieName, session.token, sessionService.cookieOptions(session.expiresAt, req));
      return ok(reply, user, `خوش برگشتی، ${user.name}! 👁️`);
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

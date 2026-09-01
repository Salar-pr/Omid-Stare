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

async function authenticate(req, reply) {
  const token = req.cookies ? req.cookies[config.cookieName] : null;
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

module.exports = { authenticate, requireAdmin };

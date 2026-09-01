'use strict';
/**
 * users.routes — GET /users/me, PATCH /users/me, POST /users/me/change-password,
 *               POST /users/me/avatar (multipart)
 */
const userService = require('./users.service');
const { ok, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');
const config = require('../../config');

async function usersRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.get('/users/me', async (req, reply) => {
    try {
      return ok(reply, await userService.getMe(req));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.patch('/users/me', async (req, reply) => {
    try {
      const user = await userService.updateName(req, req.body || {});
      req.user = user; // sync in-request
      return ok(reply, user, 'پروفایلت آپدیت شد! 🤘');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/users/me/change-password', async (req, reply) => {
    try {
      await userService.changePassword(req, req.body || {});
      return ok(reply, null, 'رمزت عوض شد 🔒');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post(
    '/users/me/avatar',
    { bodyLimit: config.maxAvatarBytes + 64 * 1024 }, // سقف global (1MB) نباید آواتار ۲MBی مجاز را ببُرد
    async (req, reply) => {
      try {
        const parts = req.body || {};
        const file = parts.file;
        const result = await userService.uploadAvatar(req, file && typeof file.toBuffer === 'function' ? file : null);
        return ok(reply, result, result.avatarUrl ? 'عکس پروفایلت آپدیت شد! 🤘' : 'برگشتی به آواتار پیش‌فرض 🖤');
      } catch (err) {
        return fail(reply, err, req.log);
      }
    }
  );
}

module.exports = usersRoutes;

'use strict';
/**
 * questions.routes — public list + create (guest یا user)
 */
const questionsService = require('./questions.service');
const { ok, created, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');
const { z } = require('zod');
const config = require('../../config');

const idParam = z.string().uuid();

async function questionsRoutes(app) {
  app.get('/products/:productId/questions', async (req, reply) => {
    try {
      idParam.parse(req.params.productId);
      return ok(reply, { items: await questionsService.listPublished(req.params.productId) });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post(
    '/products/:productId/questions',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      try {
        idParam.parse(req.params.productId);
        // مهمان: بدون auth — name اختیاری از body
        let user = null;
        if (req.cookies && req.cookies[config.cookieName]) {
          const sessionService = require('../auth/session.service');
          user = await sessionService.userByToken(req.cookies[config.cookieName]);
        }
        const result = await questionsService.create(
          user ? user.id : null,
          user ? user.name : null,
          req.params.productId,
          req.body || {}
        );
        return created(reply, result, 'سوالت ثبت شد — به‌زودی جواب می‌دم 🎸');
      } catch (err) {
        return fail(reply, err, req.log);
      }
    }
  );
}

module.exports = questionsRoutes;

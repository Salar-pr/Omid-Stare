'use strict';
/**
 * reviews.routes — public list + auth create
 * (moderation در admin.routes)
 */
const reviewsService = require('./reviews.service');
const { ok, created, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');
const { z } = require('zod');

const idParam = z.string().uuid();

async function reviewsRoutes(app) {
  app.get('/products/:productId/reviews', async (req, reply) => {
    try {
      idParam.parse(req.params.productId);
      return ok(reply, await reviewsService.listApproved(req.params.productId, req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/products/:productId/reviews', { preHandler: [authenticate] }, async (req, reply) => {
    try {
      idParam.parse(req.params.productId);
      const result = await reviewsService.create(req.user.id, req.user.name, req.params.productId, req.body || {});
      return created(reply, result, 'نظرت ثبت شد — بعد از تأیید نمایش داده می‌شه ⭐');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = reviewsRoutes;

'use strict';
/**
 * wishlist.routes — auth required
 * GET /wishlist, POST /wishlist/:productId, DELETE /wishlist/:productId, DELETE /wishlist
 */
const wishlistService = require('./wishlist.service');
const { ok, created, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');

async function wishlistRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.get('/wishlist', async (req, reply) => {
    try {
      return ok(reply, { items: await wishlistService.list(req.user.id) });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/wishlist/:productId', async (req, reply) => {
    try {
      const result = await wishlistService.add(req.user.id, req.params.productId);
      return ok(
        reply,
        result,
        result.existed ? 'قبلا تو ویش‌لیستت بود ♡' : 'به ویش‌لیست اضافه شد ♡',
        result.existed ? 200 : 201
      );
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.delete('/wishlist/:productId', async (req, reply) => {
    try {
      await wishlistService.remove(req.user.id, req.params.productId);
      return ok(reply, null, 'از علاقه‌مندی‌ها حذف شد ♡');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.delete('/wishlist', async (req, reply) => {
    try {
      await wishlistService.clear(req.user.id);
      return ok(reply, null, 'ویش‌لیست خالی شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = wishlistRoutes;

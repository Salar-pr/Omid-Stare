'use strict';
/**
 * coupons.routes — user side (admin side در admin.routes)
 * POST /coupons/claim   (rate-limited سخت — brute-force protection)
 * GET  /coupons/my
 */
const couponsService = require('./coupons.service');
const { ok, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');
const config = require('../../config');

async function couponsRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.post(
    '/coupons/claim',
    { config: { rateLimit: { max: config.rateLimit.couponClaim, timeWindow: '15 minutes' } } },
    async (req, reply) => {
      try {
        const result = await couponsService.claim(req.user.id, req.body || {});
        return ok(reply, result, 'کد به حسابت اضافه شد! حالا موقع خرید اعمالش کن 🎟️');
      } catch (err) {
        if (err && err.name === 'ApiError' && ['INVALID_COUPON', 'COUPON_TAKEN', 'NOT_YOUR_COUPON'].includes(err.code)) {
          req.log.warn({ code: err.code, userId: req.user.id }, 'coupon claim rejected');
        } else if (err) {
          req.log.error({ err }, 'coupon claim error');
        }
        return fail(reply, err, req.log);
      }
    }
  );

  app.get('/coupons/my', async (req, reply) => {
    try {
      return ok(reply, { items: await couponsService.myCoupons(req.user.id) });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = couponsRoutes;

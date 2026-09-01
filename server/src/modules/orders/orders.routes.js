'use strict';
/**
 * orders.routes — auth required
 * POST /orders, GET /orders, GET /orders/:id
 */
const ordersService = require('./orders.service');
const { ok, created, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');
const { NotFoundError } = require('../../utils/errors');
const config = require('../../config');

async function ordersRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.post(
    '/orders',
    { config: { rateLimit: { max: config.rateLimit.order, timeWindow: '1 hour' } } },
    async (req, reply) => {
      try {
        const order = await ordersService.createOrder(req.user.id, req.user, req.body || {});
        return created(reply, order, `سفارشت ثبت شد — شماره ${order.orderNumber} 🌀`);
      } catch (err) {
        if (err && err.name === 'ApiError') {
          if (req.log) req.log.warn({ code: err.code }, 'order creation failed');
        } else {
          if (req.log) req.log.error({ err }, 'order creation failed');
        }
        return fail(reply, err, req.log);
      }
    }
  );

  app.get('/orders', async (req, reply) => {
    try {
      return ok(reply, await ordersService.listMine(req.user.id, req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.get('/orders/:id', async (req, reply) => {
    try {
      const order = await ordersService.getOrderFull(req.params.id);
      if (!order) throw new NotFoundError('سفارش پیدا نشد.');
      if (String(order.userId) !== String(req.user.id)) {
        // ownership guard: فقط مالک
        throw new NotFoundError('این سفارش مال تو نیست.');
      }
      return ok(reply, order);
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = ordersRoutes;

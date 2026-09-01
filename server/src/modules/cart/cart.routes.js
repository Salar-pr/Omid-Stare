'use strict';
/**
 * cart.routes — server-side cart (auth required)
 * GET /cart, GET /cart/summary, GET /cart/quote, POST /cart/items,
 * PATCH /cart/items/:id, DELETE /cart/items/:id, DELETE /cart
 */
const cartService = require('./cart.service');
const ordersService = require('../orders/orders.service');
const { ok, fail } = require('../../utils/respond');
const { authenticate } = require('../../middlewares/auth');

async function cartRoutes(app) {
  app.addHook('preHandler', authenticate);

  app.get('/cart', async (req, reply) => {
    try {
      return ok(reply, await cartService.getCart(req.user.id));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.get('/cart/summary', async (req, reply) => {
    try {
      const cart = await cartService.getCart(req.user.id);
      return ok(reply, { count: cart.count, subtotal: cart.subtotal });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // پیش‌نمایش تخفیف (couponId از /coupons/my) — بدون تغییر state
  app.get('/cart/quote', async (req, reply) => {
    try {
      return ok(reply, await ordersService.quote(req.user.id, req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.post('/cart/items', async (req, reply) => {
    try {
      const result = await cartService.addItem(req.user.id, req.body || {});
      const cart = await cartService.getCart(req.user.id);
      return ok(reply, { ...result, subtotal: cart.subtotal, count: cart.count }, 'به سبد اضافه شد 🛒');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.patch('/cart/items/:id', async (req, reply) => {
    try {
      await cartService.updateItem(req.user.id, req.params.id, req.body || {});
      const cart = await cartService.getCart(req.user.id);
      return ok(reply, { subtotal: cart.subtotal, count: cart.count }, 'آیتم آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.delete('/cart/items/:id', async (req, reply) => {
    try {
      await cartService.removeItem(req.user.id, req.params.id);
      const cart = await cartService.getCart(req.user.id);
      return ok(reply, { subtotal: cart.subtotal, count: cart.count }, 'از سبد حذف شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.delete('/cart', async (req, reply) => {
    try {
      await cartService.clearCart(req.user.id);
      return ok(reply, { subtotal: 0, count: 0 }, 'سبد خالی شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = cartRoutes;

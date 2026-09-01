'use strict';
/**
 * api.routes — ثبت همه‌ی routeها (public + auth + admin).
 * هر ماژول یک plugin ساده است.
 */
const path = require('node:path');
const fs = require('node:fs');
const { checkConnection } = require('../db/client');
const config = require('../config');

async function apiRoutes(app) {
  // health — همیشه زنده + وضعیت DB
  app.get('/health', async (req, reply) => {
    let db = 'down';
    let latencyMs = null;
    try {
      const r = await checkConnection();
      db = r.up ? 'up' : 'down';
      latencyMs = r.latencyMs;
    } catch (e) {
      db = 'down';
    }
    reply.send({
      success: true,
      status: 'ok',
      data: { db, dbLatencyMs: latencyMs, uptimeSec: Math.round(process.uptime()), env: config.env, timestamp: new Date().toISOString() },
      message: 'ok',
    });
  });

  // docs — OpenAPI + صفحه مستندات (خودکفا، بدون CDN)
  const docsDir = path.join(__dirname, 'docs');
  app.get('/docs.json', async (req, reply) => {
    reply.type('application/json; charset=utf-8').send(fs.readFileSync(path.join(docsDir, 'openapi.json'), 'utf8'));
  });
  app.get('/docs', async (req, reply) => {
    reply.type('text/html; charset=utf-8').send(fs.readFileSync(path.join(docsDir, 'docs.html'), 'utf8'));
  });

  await app.register(require('./auth/auth.routes'));
  await app.register(require('./users/users.routes'));
  await app.register(require('./products/products.routes'));
  await app.register(require('./albums/albums.routes'));
  await app.register(require('./cart/cart.routes'));
  await app.register(require('./orders/orders.routes'));
  await app.register(require('./wishlist/wishlist.routes'));
  await app.register(require('./coupons/coupons.routes'));
  await app.register(require('./contact/contact.routes'));
  await app.register(require('./content/content.routes'));
  await app.register(require('./reviews/reviews.routes'));
  await app.register(require('./questions/questions.routes'));
  await app.register(require('./admin/admin.routes'), { prefix: '/admin' });
}

module.exports = apiRoutes;

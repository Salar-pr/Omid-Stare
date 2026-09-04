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
  // CORS فقط برای محیط پیش‌نمایش/دمو (allowEmbedding). باید *قبل از* CSRF
  // ثبت شود تا preflight (OPTIONS) پیش از هر بررسی دیگری پاسخ بگیرد.
  //
  // چرا لازم است؟ اگر iframe بدون allow-same-origin در sandbox باشد، صفحه در
  // «مبدأ مات» اجرا می‌شود و مرورگر Origin: null می‌فرستد؛ بدون این هدرها
  // همه‌ی fetchها با خطای CORS رد می‌شوند و ورود اصلاً کار نمی‌کند.
  //
  // نکته: با Origin: null نمی‌توان credentials را مجاز کرد (مرورگر
  // Allow-Origin: null + Allow-Credentials: true را رد می‌کند). در آن حالت
  // کوکی هم در دسترس نیست، پس احراز هویت از مسیر Authorization: Bearer
  // انجام می‌شود که به CORS credentials نیازی ندارد.
  //
  // در production خاموش است، پس سیاست same-origin دست‌نخورده می‌ماند.
  if (config.allowEmbedding) {
    app.addHook('onRequest', async (req, reply) => {
      const origin = req.headers.origin;
      if (!origin) return;

      const opaque = origin === 'null';
      reply.header('Access-Control-Allow-Origin', opaque ? '*' : origin);
      if (!opaque) {
        reply.header('Access-Control-Allow-Credentials', 'true');
      }
      reply.header('Vary', 'Origin');
    });

    // پاسخ به preflight. با wildcard ثبت می‌شود چون Fastify برای مسیرهای
    // معمولی هندلر OPTIONS ندارد و بدون این، preflight با 404 رد می‌شود.
    app.options('/*', async (req, reply) => {
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      reply.header('Access-Control-Max-Age', '600');
      return reply.code(204).send();
    });
  }

  // دفاع CSRF لایه‌دوم: درخواست‌های تغییردهنده از مبدأ بیگانه رد می‌شوند.
  // (خط دفاع اول کوکی SameSite است — این مکمل آن است، نه جایگزین.)
  app.addHook('onRequest', require('../middlewares/csrf').csrfGuard);

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

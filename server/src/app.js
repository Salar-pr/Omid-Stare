'use strict';
/**
 * app.js — ساختار Fastify: plugins، security، static، error handler، routes.
 * server.js فقط entry point است.
 */
const path = require('node:path');
const fs = require('node:fs');
const Fastify = require('fastify');
const cookie = require('@fastify/cookie');
const staticPlugin = require('@fastify/static');
const rateLimit = require('@fastify/rate-limit');
const compress = require('@fastify/compress');
const helmet = require('@fastify/helmet');
const multipart = require('@fastify/multipart');

const config = require('./config');
const { fail } = require('./utils/respond');

// مسیرهایی که هرگز از static server ندهیم (security!)
const DENY_PREFIXES = ['.git', 'server', 'node_modules', 'deploy', 'test', 'scripts'];
const DENY_FILES = ['.env', '.env.example', 'docker-compose.yml', 'AUDIT.md'];

async function registerStatic(app) {
  fs.mkdirSync(path.join(config.uploadDir, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(config.uploadDir, 'media'), { recursive: true });

  // /media → uploads (آواتار/عکس‌های admin)
  await app.register(staticPlugin, {
    root: config.uploadDir,
    prefix: '/media/',
    decorateReply: false,
  });

  // ریشه frontend با guard ضد فاش شدن فایل‌های حساس (server/, .git, .env, ...)
  await app.register(async (instance) => {
    instance.addHook('onRequest', (req, reply, done) => {
      const p = (req.url || '/').split('?')[0];
      const segs = p.split('/').filter(Boolean);
      const first = segs[0] ? decodeURIComponent(segs[0]) : '';
      if (DENY_PREFIXES.includes(first) || DENY_FILES.includes(first)) {
        reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'پیدا نشد.' } });
        return;
      }
      done();
    });
    await instance.register(staticPlugin, {
      root: config.frontendDir,
      index: ['index.html'],
      decorateReply: false,
      wildcard: true,
    });
  });
}

async function buildApp({ logger = true } = {}) {
  const app = Fastify({
    logger: {
      enabled: logger,
      level: 'info',
      redact: {
        // هیچ وقت password / session token / coupon code در log نباشد
        paths: [
          'req.headers.cookie',
          'req.cookies.sid',
          'req.body.password',
          'req.body.currentPassword',
          'req.body.newPassword',
          'req.body.code',
          'req.body.couponCode',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
    },
    trustProxy: true,
    bodyLimit: 1024 * 1024, // 1MB JSON
  });

  // ---------- plugins ----------
  await app.register(cookie, { secret: config.isProd ? 'omid-stare-cookie-signing' : undefined });
  await app.register(compress, { threshold: 1024 });
  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 5 } });
  await app.register(helmet, {
    // CSP خاموش: frontend فعلی inline script/style زیاد دارد (هویت بصری حفظ می‌شود).
    // بقیه هدرهای امنیتی فعالند.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-site' },
  });

  // rate limit جهانی + per-route (auth/coupon/contact/order در routeهایشان سخت‌ترند)
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.global,
    timeWindow: '15 minutes',
    errorResponseBuilder: () => ({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'درخواستات خیلی شلوغه — چند دقیقه بعد امتحان کن.' },
    }),
  });

  // ---------- static ----------
  await registerStatic(app);

  // ---------- error handling ----------
  app.setErrorHandler((err, req, reply) => fail(reply, err, req.log));
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api')) {
      return reply.code(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'این endpoint وجود ندارد.' },
      });
    }
    return reply
      .code(404)
      .type('text/html; charset=utf-8')
      .send(
        '<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>404</title><body style="background:#08070f;color:#f7f2e8;font-family:Tahoma;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="text-align:center"><div style="font-size:3rem">🌀</div><h1>۴۰۴</h1><p>این صفحه تو ووید گم شده.</p><a href="/" style="color:#00ffd1">بازگرد به خانه</a></div></body></html>'
      );
  });

  // ---------- API ----------
  const api = require('./modules/api.routes');
  await app.register(api, { prefix: '/api' });

  return app;
}

module.exports = { buildApp };

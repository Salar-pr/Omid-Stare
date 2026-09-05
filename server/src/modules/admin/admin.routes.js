'use strict';
/**
 * admin.routes — همه endpoints مدیریتی. prefix /api/admin
 * هر route: authenticated + active + role=admin (requireAdmin).
 */
const { ok, created, fail } = require('../../utils/respond');
const { requireAdmin } = require('../../middlewares/auth');
const config = require('../../config');
const dashboard = require('./dashboard.service');
const products = require('./products.service');
const orders = require('./orders.service');
const fulfillment = require('./fulfillment.service');
const users = require('./users.service');
const albums = require('./albums.service');
const media = require('./media.service');
const contact = require('../contact/contact.service');
const content = require('../content/content.service');
const coupons = require('../coupons/coupons.service');
const reviews = require('../reviews/reviews.service');
const questions = require('../questions/questions.service');
const notification = require('../../services/notification.service');

async function adminRoutes(app) {
  app.addHook('preHandler', requireAdmin);

  // ---------- dashboard ----------
  app.get('/dashboard', async (req, reply) => {
    try {
      return ok(reply, await dashboard.stats());
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- fulfillment (وضعیت ارسال) ----------
  // خلاصه: چند تا فرستاده شده، چند تا مانده، چند تا معطل
  app.get('/fulfillment/summary', async (req, reply) => {
    try {
      return ok(reply, await fulfillment.summary());
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // لیست گروه‌بندی‌شده: ?group=pending|shipped|stale|all
  app.get('/fulfillment/orders', async (req, reply) => {
    try {
      return ok(reply, await fulfillment.list(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- users ----------
  app.get('/users', async (req, reply) => {
    try {
      return ok(reply, await users.list(req.query || {}, req.user));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/users/:id', async (req, reply) => {
    try {
      return ok(reply, await users.update(req.user, req.params.id, req.body || {}), 'کاربر آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- products ----------
  app.get('/products', async (req, reply) => {
    try {
      return ok(reply, await products.list(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/products', async (req, reply) => {
    try {
      return created(reply, await products.create(req.body || {}), 'محصول ساخته شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.get('/products/:id', async (req, reply) => {
    try {
      return ok(reply, await products.get(req.params.id));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/products/:id', async (req, reply) => {
    try {
      return ok(reply, await products.update(req.params.id, req.body || {}), 'محصول آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.delete('/products/:id', async (req, reply) => {
    try {
      return ok(reply, await products.remove(req.params.id, req.query.hard === '1'), 'محصول حذف/آرکایو شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- albums ----------
  app.get('/albums', async (req, reply) => {
    try {
      return ok(reply, { items: await albums.listAll() });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/albums', async (req, reply) => {
    try {
      const id = await albums.create(req.body || {});
      return created(reply, { id }, 'آلبوم ساخته شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/albums/:id', async (req, reply) => {
    try {
      await albums.update(req.params.id, req.body || {});
      return ok(reply, null, 'آلبوم آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.delete('/albums/:id', async (req, reply) => {
    try {
      return ok(reply, await albums.remove(req.params.id, req.query.hard === '1'), 'آلبوم حذف/آرکایو شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/albums/:id/move', async (req, reply) => {
    try {
      const dir = (req.body || {}).direction;
      if (!['up', 'down'].includes(dir)) return fail(reply, require('../../utils/errors').ValidationError('direction معتبر نیست.'), req.log);
      return ok(reply, await albums.move(req.params.id, dir), 'ترتیب تغییر کرد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.get('/albums/:id/tracks', async (req, reply) => {
    try {
      return ok(reply, { items: await albums.listTracks(req.params.id) });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/albums/:id/tracks', async (req, reply) => {
    try {
      const id = await albums.addTrack(req.params.id, req.body || {});
      return created(reply, { id }, 'ترک اضافه شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/albums/:id/tracks/:trackId', async (req, reply) => {
    try {
      await albums.updateTrack(req.params.trackId, req.body || {});
      return ok(reply, null, 'ترک آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.delete('/albums/:id/tracks/:trackId', async (req, reply) => {
    try {
      await albums.removeTrack(req.params.trackId);
      return ok(reply, null, 'ترک حذف شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- orders ----------
  app.get('/orders', async (req, reply) => {
    try {
      return ok(reply, await orders.list(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.get('/orders/:id', async (req, reply) => {
    try {
      return ok(reply, await orders.get(req.params.id));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/orders/:id/status', async (req, reply) => {
    try {
      return ok(reply, await orders.updateStatus(req.user, req.params.id, req.body || {}), 'وضعیت سفارش آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- coupons ----------
  app.get('/coupons/campaigns', async (req, reply) => {
    try {
      return ok(reply, { items: await coupons.listCampaigns() });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/coupons/campaigns', async (req, reply) => {
    try {
      const result = await coupons.createCampaign(req.body || {});
      return created(
        reply,
        result,
        'کمپین ساخته شد — کدها فقط همین‌جا یک‌بار نمایش داده می‌شوند؛ کپی کن!'
      );
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.post('/coupons/campaigns/:id/codes', async (req, reply) => {
    try {
      const count = parseInt((req.body || {}).count || '10', 10);
      const codes = await coupons.generateMoreCodes(req.params.id, count);
      return ok(reply, { codes }, `${codes.length} کد جدید تولید شد — کپی کن!`);
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/coupons/campaigns/:id', async (req, reply) => {
    try {
      await coupons.updateCampaign(req.params.id, req.body || {});
      return ok(reply, null, 'کمپین آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.delete('/coupons/campaigns/:id', async (req, reply) => {
    try {
      await coupons.deleteCampaign(req.params.id);
      return ok(reply, null, 'کمپین حذف شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- contact messages ----------
  app.get('/messages', async (req, reply) => {
    try {
      return ok(reply, await contact.list(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/messages/:id', async (req, reply) => {
    try {
      await contact.setStatus(req.params.id, (req.body || {}).status);
      return ok(reply, null, 'پیام آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.delete('/messages/:id', async (req, reply) => {
    try {
      await contact.remove(req.params.id);
      return ok(reply, null, 'پیام حذف شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- content (CMS) ----------
  app.get('/content', async (req, reply) => {
    try {
      return ok(reply, await content.getAllPublic());
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.put('/content/:key', async (req, reply) => {
    try {
      const value = await content.set(req.params.key, (req.body || {}).value !== undefined ? (req.body || {}).value : req.body);
      return ok(reply, { key: req.params.key, value }, 'محتوا ذخیره شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- reviews & questions moderation ----------
  app.get('/reviews', async (req, reply) => {
    try {
      return ok(reply, await reviews.listAllAdmin(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/reviews/:id', async (req, reply) => {
    try {
      await reviews.moderate(req.params.id, (req.body || {}).isApproved === true);
      return ok(reply, null, 'نظر آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.get('/questions', async (req, reply) => {
    try {
      return ok(reply, await questions.listAllAdmin(req.query || {}));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
  app.patch('/questions/:id', async (req, reply) => {
    try {
      await questions.answer(req.params.id, (req.body || {}).answer, (req.body || {}).isPublished);
      return ok(reply, null, 'سوال آپدیت شد');
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  // ---------- media upload ----------
  app.post(
    '/upload',
    { bodyLimit: config.maxUploadBytes + 64 * 1024 }, // سقف global (1MB) نباید آپلود ۵MBی مجاز را ببُرد
    async (req, reply) => {
      try {
        const parts = req.body || {};
        const file = parts.file;
        return created(reply, await media.upload(file), 'فایل آپلود شد');
      } catch (err) {
        return fail(reply, err, req.log);
      }
    }
  );

  // ---------- notifications (unread admin events) ----------
  const { pool } = require('../../db/client');
  app.get('/notifications', async (req, reply) => {
    try {
      const { rows } = await pool.query(
        'SELECT type, payload, created_at FROM notifications ORDER BY created_at DESC LIMIT 30'
      );
      return ok(reply, { items: rows });
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = adminRoutes;

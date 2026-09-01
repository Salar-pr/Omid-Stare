'use strict';
/**
 * contact.routes — public POST (rate-limited) + admin endpoints در admin.routes
 */
const contactService = require('./contact.service');
const { created, fail } = require('../../utils/respond');
const config = require('../../config');

async function contactRoutes(app) {
  app.post(
    '/contact',
    { config: { rateLimit: { max: config.rateLimit.contact, timeWindow: '1 hour' } } },
    async (req, reply) => {
      try {
        const row = await contactService.create(req.body || {});
        return created(reply, row, 'پیامت رسید! به‌زودی جواب می‌دم 🤘');
      } catch (err) {
        return fail(reply, err, req.log);
      }
    }
  );
}

module.exports = contactRoutes;

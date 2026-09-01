'use strict';
/**
 * content.routes — public read: GET /content
 */
const contentService = require('./content.service');
const { ok, fail } = require('../../utils/respond');

async function contentRoutes(app) {
  app.get('/content', async (req, reply) => {
    try {
      return ok(reply, await contentService.getAllPublic());
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = contentRoutes;

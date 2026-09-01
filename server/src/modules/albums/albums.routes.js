'use strict';
/**
 * albums.routes — public read-only
 * GET /albums, GET /albums/:id
 */
const albumsService = require('./albums.service');
const { ok, fail, page } = require('../../utils/respond');

async function albumsRoutes(app) {
  app.get('/albums', async (req, reply) => {
    try {
      const { items, pagination } = await albumsService.list(req.query || {});
      return ok(reply, page(pagination, items));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.get('/albums/:id', async (req, reply) => {
    try {
      return ok(reply, await albumsService.byId(req.params.id));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = albumsRoutes;

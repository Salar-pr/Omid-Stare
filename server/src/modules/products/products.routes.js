'use strict';
/**
 * products.routes — public read-only API
 * GET /products, GET /products/:idOrSlug
 * (writeها در admin.routes)
 */
const productsService = require('./products.service');
const { ok, fail, page } = require('../../utils/respond');

async function productsRoutes(app) {
  app.get('/products', async (req, reply) => {
    try {
      const { items, pagination } = await productsService.list(req.query || {});
      return ok(reply, page(pagination, items));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });

  app.get('/products/:idOrSlug', async (req, reply) => {
    try {
      return ok(reply, await productsService.byIdOrSlug(req.params.idOrSlug));
    } catch (err) {
      return fail(reply, err, req.log);
    }
  });
}

module.exports = productsRoutes;

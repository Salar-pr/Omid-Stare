'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { resetDb, createApp } = require('./helpers');

let app;
before(async () => {
  app = await createApp();
  await resetDb();
});
after(async () => {
  await app.close();
  const { pool } = require('../src/db/client');
  await pool.end();
});

test('GET /products: list from DB with pagination shape', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/products' });
  assert.strictEqual(res.statusCode, 200);
  const d = res.json();
  assert.strictEqual(d.success, true);
  assert.ok(d.data.items.length === 2);
  assert.ok(d.data.pagination.page === 1);
  assert.ok(d.data.pagination.total === 2);
  const p = d.data.items[0];
  assert.ok(typeof p.price === 'number');
  assert.ok(Array.isArray(p.sizes));
});

test('GET /products/:slug: detail by slug with related', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/products/t-shirt' });
  assert.strictEqual(res.statusCode, 200);
  const d = res.json().data;
  assert.strictEqual(d.slug, 't-shirt');
  assert.strictEqual(d.price, 100000);
  assert.strictEqual(d.stock, 10);
  assert.ok(Array.isArray(d.related));
});

test('GET /products/:idOrSlug: unknown → 404', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/products/nope-xyz' });
  assert.strictEqual(res.statusCode, 404);
  assert.strictEqual(res.json().error.code, 'NOT_FOUND');
});

test('GET /products?search: server-side search', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/products?search=وینیل' });
  assert.strictEqual(res.statusCode, 200);
  const d = res.json().data;
  assert.strictEqual(d.items.length, 1);
  assert.strictEqual(d.items[0].slug, 'vinyl');
});

test('GET /products filters: maxPrice + inStock + sort', async () => {
  const r1 = await app.inject({ method: 'GET', url: '/api/products?maxPrice=200000' });
  assert.strictEqual(r1.json().data.items.length, 1);

  const r2 = await app.inject({ method: 'GET', url: '/api/products?sort=price-desc' });
  const prices = r2.json().data.items.map((i) => i.price);
  assert.deepStrictEqual(prices, [500000, 100000]);
});

test('GET /albums: published list with tracks', async () => {
  const res = await app.inject({ method: 'GET', url: '/api/albums' });
  assert.strictEqual(res.statusCode, 200);
  const d = res.json().data;
  assert.strictEqual(d.items.length, 1);
  assert.strictEqual(d.items[0].title, 'Test Album');
  assert.strictEqual(d.items[0].tracks.length, 1);
});

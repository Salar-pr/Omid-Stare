'use strict';
/**
 * users-orders.test.js — رگرسیون‌های users/me و جزئیات سفارش:
 *  - GET /users/me قبلاً 500 می‌داد (coupons.rows.map روی آرایه) → حالا counts + coupons برمی‌گرداند
 *  - history سفارش باید camelCase باشد (fromStatus/toStatus/actor/at) — فرانت همین را می‌خواند
 *  - آیتم‌های سفارش باید image داشته باشند (join با products)
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { resetDb, createApp, registerUser } = require('./helpers');

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

async function firstProductId() {
  const res = await app.inject({ method: 'GET', url: '/api/products?limit=1' });
  return res.json().data.items[0].id;
}

test('GET /users/me → 200 با counts و coupons (رگرسیون 500)', async () => {
  const { cookie } = await registerUser(app);
  const res = await app.inject({ method: 'GET', url: '/api/users/me', headers: { cookie } });
  assert.strictEqual(res.statusCode, 200);
  const body = res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.counts.orders, 0);
  assert.strictEqual(body.data.counts.cart_qty, 0);
  assert.strictEqual(body.data.counts.wishlist, 0);
  assert.ok(Array.isArray(body.data.coupons));
});

test('جزئیات سفارش: history به camelCase + image آیتم‌ها (قرارداد فرانت)', async () => {
  const { cookie } = await registerUser(app);
  const productId = await firstProductId();

  const addRes = await app.inject({
    method: 'POST',
    url: '/api/cart/items',
    headers: { cookie },
    payload: { productId, quantity: 1 },
  });
  assert.strictEqual(addRes.statusCode, 200);

  const orderRes = await app.inject({
    method: 'POST',
    url: '/api/orders',
    headers: { cookie },
    payload: { customerName: 'تستر', customerPhone: '09120000000', shippingAddress: 'تهران' },
  });
  assert.strictEqual(orderRes.statusCode, 201);
  const orderId = orderRes.json().data.id;

  const res = await app.inject({ method: 'GET', url: `/api/orders/${orderId}`, headers: { cookie } });
  assert.strictEqual(res.statusCode, 200);
  const o = res.json().data;

  // با جزئیات خود محصول مقایسه کنیم (به ترتیب لیست وابسته نیست)
  const detail = (await app.inject({ method: 'GET', url: `/api/products/${productId}` })).json().data;
  assert.ok(Array.isArray(o.items) && o.items.length === 1);
  assert.strictEqual(o.items[0].productName, detail.name);
  assert.strictEqual(o.items[0].image, detail.image);

  assert.ok(Array.isArray(o.history) && o.history.length >= 1);
  const h = o.history[0];
  assert.strictEqual(h.toStatus, 'pending');
  assert.strictEqual(h.fromStatus, null);
  assert.ok('actor' in h && 'at' in h);
});

test('آپلود آواتار: multipart → avatarUrl (رگرسیون attachFieldsToBody)', async () => {
  const { cookie } = await registerUser(app);
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
    'base64'
  );
  const fd = new FormData();
  fd.append('file', new Blob([png], { type: 'image/png' }), 'a.png');
  const res = await app.inject({ method: 'POST', url: '/api/users/me/avatar', headers: { cookie }, payload: fd });
  assert.strictEqual(res.statusCode, 200, res.body);
  const body = res.json();
  assert.ok(body.success === true);
  assert.ok(body.data.avatarUrl && body.data.avatarUrl.startsWith('/media/avatars/'), JSON.stringify(body));
});

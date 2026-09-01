'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { resetDb, createApp, registerUser, loginUser } = require('./helpers');
const { pool } = require('../src/db/client');

let app;
let user;
let tshirtId;

before(async () => {
  app = await createApp();
  await resetDb();
  user = await registerUser(app);
  const { rows } = await pool.query(`SELECT id FROM products WHERE slug = 't-shirt'`);
  tshirtId = rows[0].id;
});
after(async () => {
  await app.close();
  await pool.end();
});

async function cartItemId() {
  const res = await app.inject({ method: 'GET', url: '/api/cart', headers: { cookie: user.cookie } });
  return res.json().data.items[0].id;
}

test('cart: add uses DB price (client price ignored)', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/cart/items',
    headers: { cookie: user.cookie },
    payload: { productId: tshirtId, quantity: 2, price: 1, stock: 999 },
  });
  assert.strictEqual(res.statusCode, 200);
  const d = res.json().data;
  assert.strictEqual(d.subtotal, 200000); // 2 × 100000 from DB
});

test('cart: update quantity + stock exceeded → 400 INSUFFICIENT_STOCK', async () => {
  const id = await cartItemId();
  const up = await app.inject({
    method: 'PATCH',
    url: `/api/cart/items/${id}`,
    headers: { cookie: user.cookie },
    payload: { quantity: 5 },
  });
  assert.strictEqual(up.statusCode, 200);
  assert.strictEqual(up.json().data.subtotal, 500000);

  const over = await app.inject({
    method: 'PATCH',
    url: `/api/cart/items/${id}`,
    headers: { cookie: user.cookie },
    payload: { quantity: 99 },
  });
  assert.strictEqual(over.statusCode, 400);
  assert.strictEqual(over.json().error.code, 'INSUFFICIENT_STOCK');
});

test('order: created in one tx — snapshot, stock, orderNumber OR-<yy>-<seq>', async () => {
  // qty 5 از قبلی + 1 وینیل
  const { rows } = await pool.query(`SELECT id FROM products WHERE slug = 'vinyl'`);
  await app.inject({
    method: 'POST',
    url: '/api/cart/items',
    headers: { cookie: user.cookie },
    payload: { productId: rows[0].id, quantity: 1 },
  });

  const res = await app.inject({
    method: 'POST',
    url: '/api/orders',
    headers: { cookie: user.cookie },
    payload: {
      customerName: 'کاربر تست',
      customerPhone: '09120000001',
      shippingAddress: 'تهران، خیابان تست ۱۲',
    },
  });
  assert.strictEqual(res.statusCode, 201, res.body);
  const o = res.json().data;
  assert.match(o.orderNumber, /^OR-\d{4}-\d{6}$/);
  assert.strictEqual(o.status, 'pending');
  assert.strictEqual(o.paymentStatus, 'unpaid');
  assert.strictEqual(o.subtotal, 1000000); // 5×100k + 1×500k
  assert.strictEqual(o.items.length, 2);
  const tshirt = o.items.find((i) => i.productName === 'تیشرت تست');
  assert.ok(tshirt, 'snapshot item exists');
  assert.strictEqual(tshirt.quantity, 5);

  const st = await pool.query(`SELECT stock FROM products WHERE slug='t-shirt'`);
  assert.strictEqual(st.rows[0].stock, 5); // 10 - 5
  const st2 = await pool.query(`SELECT stock FROM products WHERE slug='vinyl'`);
  assert.strictEqual(st2.rows[0].stock, 1); // 2 - 1

  const cart = await app.inject({ method: 'GET', url: '/api/cart', headers: { cookie: user.cookie } });
  assert.strictEqual(cart.json().data.count, 0); // cart cleared
});

test('orders: empty cart → 400 EMPTY_CART', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/orders',
    headers: { cookie: user.cookie },
    payload: { customerName: 'کاربر', customerPhone: '09120000001', shippingAddress: 'تهران، خیابان تست ۱۲' },
  });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.json().error.code, 'EMPTY_CART');
});

test('orders: list + detail (owner only)', async () => {
  const list = await app.inject({ method: 'GET', url: '/api/orders', headers: { cookie: user.cookie } });
  assert.strictEqual(list.statusCode, 200);
  assert.strictEqual(list.json().data.items.length, 1);
  const orderId = list.json().data.items[0].id;

  const detail = await app.inject({ method: 'GET', url: `/api/orders/${orderId}`, headers: { cookie: user.cookie } });
  assert.strictEqual(detail.statusCode, 200);
  assert.ok(detail.json().data.history.length >= 1);

  // کاربر دیگر → 404 (نه 403 — existence leak نشود)
  const other = await registerUser(app);
  const denied = await app.inject({ method: 'GET', url: `/api/orders/${orderId}`, headers: { cookie: other.cookie } });
  assert.strictEqual(denied.statusCode, 404);
});

test('wishlist: add / duplicate / remove', async () => {
  const { rows } = await pool.query(`SELECT id FROM products WHERE slug = 'vinyl'`);
  const pid = rows[0].id;
  const a1 = await app.inject({ method: 'POST', url: `/api/wishlist/${pid}`, headers: { cookie: user.cookie } });
  assert.strictEqual(a1.statusCode, 201);
  const a2 = await app.inject({ method: 'POST', url: `/api/wishlist/${pid}`, headers: { cookie: user.cookie } });
  assert.strictEqual(a2.json().data.existed, true);
  const del = await app.inject({ method: 'DELETE', url: `/api/wishlist/${pid}`, headers: { cookie: user.cookie } });
  assert.strictEqual(del.statusCode, 200);
  const list = await app.inject({ method: 'GET', url: '/api/wishlist', headers: { cookie: user.cookie } });
  assert.strictEqual(list.json().data.items.length, 0);
});

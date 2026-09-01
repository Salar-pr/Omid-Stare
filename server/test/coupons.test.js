'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { resetDb, createApp, registerUser, loginUser } = require('./helpers');
const { pool } = require('../src/db/client');

let app;
let user;
let admin;
let tshirtId;

before(async () => {
  app = await createApp();
  await resetDb();
  user = await registerUser(app);
  admin = await loginUser(app, 'admin@test.ir', 'Admin1405!');
  const { rows } = await pool.query(`SELECT id FROM products WHERE slug = 't-shirt'`);
  tshirtId = rows[0].id;
});
after(async () => {
  await app.close();
  await pool.end();
});

async function makeCampaign(body, cookie) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/admin/coupons/campaigns',
    headers: { cookie },
    payload: body,
  });
  assert.strictEqual(res.statusCode, 201, res.body);
  return res.json().data;
}

async function addTshirtToCart(quantity) {
  await app.inject({
    method: 'POST',
    url: '/api/cart/items',
    headers: { cookie: user.cookie },
    payload: { productId: tshirtId, quantity },
  });
}

test('admin: create campaign returns raw codes exactly once', async () => {
  const d = await makeCampaign(
    { name: 'کمپین T1', discountType: 'fixed', discountValue: 50000, codeCount: 2, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
    admin.cookie
  );
  assert.strictEqual(d.codes.length, 2);
  assert.match(d.codes[0], /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);

  // DB فقط hash دارد — raw code در هیچ جا نیست
  const { rows } = await pool.query(`SELECT code_hash, code_last4 FROM coupon_campaigns c, coupons cp WHERE cp.campaign_id = c.id AND c.name = 'کمپین T1' LIMIT 1`);
  assert.ok(!/^[A-Z2-9]{4}-/i.test(rows[0].code_hash));
  assert.strictEqual(rows[0].code_hash.length, 64); // sha256 hex
});

test('claim: valid code → claimed; wrong user → COUPON_TAKEN; invalid → INVALID_COUPON', async () => {
  const d = await makeCampaign(
    { name: 'کمپین T2', discountType: 'fixed', discountValue: 10000, codeCount: 1, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
    admin.cookie
  );
  const claim = await app.inject({
    method: 'POST',
    url: '/api/coupons/claim',
    headers: { cookie: user.cookie },
    payload: { code: d.codes[0] },
  });
  assert.strictEqual(claim.statusCode, 200);
  assert.strictEqual(claim.json().data.state, 'claimed');

  // claim مجدد توسط خودش → idempotent 200 (همان coupon)
  const again = await app.inject({
    method: 'POST',
    url: '/api/coupons/claim',
    headers: { cookie: user.cookie },
    payload: { code: d.codes[0] },
  });
  assert.strictEqual(again.statusCode, 200);
  assert.strictEqual(again.json().data.state, 'claimed');

  const bogus = await app.inject({
    method: 'POST',
    url: '/api/coupons/claim',
    headers: { cookie: user.cookie },
    payload: { code: 'ZZZZ-9999-AAAA-1111' },
  });
  assert.strictEqual(bogus.statusCode, 400);
  assert.strictEqual(bogus.json().error.code, 'INVALID_COUPON');
});

test('quote + order: fixed coupon applied server-side, then redeemed', async () => {
  const d = await makeCampaign(
    { name: 'کمپین T3', discountType: 'fixed', discountValue: 50000, codeCount: 1, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
    admin.cookie
  );
  await app.inject({
    method: 'POST', url: '/api/coupons/claim',
    headers: { cookie: user.cookie }, payload: { code: d.codes[0] },
  });
  await addTshirtToCart(2); // 200000

  const myRes = await app.inject({ method: 'GET', url: '/api/coupons/my', headers: { cookie: user.cookie } });
  const coupon = myRes.json().data.items.find((c) => c.campaignName === 'کمپین T3');
  assert.ok(coupon);

  const quote = await app.inject({
    method: 'GET',
    url: `/api/cart/quote?couponId=${coupon.id}`,
    headers: { cookie: user.cookie },
  });
  assert.strictEqual(quote.json().data.discountAmount, 50000);
  assert.strictEqual(quote.json().data.total, 150000);

  const order = await app.inject({
    method: 'POST',
    url: '/api/orders',
    headers: { cookie: user.cookie },
    payload: {
      customerName: 'کاربر تست', customerPhone: '09120000001',
      shippingAddress: 'تهران، خیابان تست ۱۲', couponId: coupon.id,
    },
  });
  assert.strictEqual(order.statusCode, 201, order.body);
  const o = order.json().data;
  assert.strictEqual(o.discountAmount, 50000);
  assert.strictEqual(o.totalAmount, 150000);

  const my2 = await app.inject({ method: 'GET', url: '/api/coupons/my', headers: { cookie: user.cookie } });
  const after = my2.json().data.items.find((c) => c.id === coupon.id);
  assert.strictEqual(after.state, 'redeemed');
});

test('percentage coupon with target product: only that line discounted', async () => {
  const d = await makeCampaign(
    {
      name: 'کمپین T4', discountType: 'percentage', discountValue: 50,
      targetProductId: tshirtId, codeCount: 1,
      expiresAt: new Date(Date.now() + 86400000 * 30).toISOString(),
    },
    admin.cookie
  );
  await app.inject({
    method: 'POST', url: '/api/coupons/claim',
    headers: { cookie: user.cookie }, payload: { code: d.codes[0] },
  });
  // سبد: ۲ تیشرت (200k) + ۱ وینیل (500k)
  await addTshirtToCart(2);
  const { rows } = await pool.query(`SELECT id FROM products WHERE slug='vinyl'`);
  await app.inject({
    method: 'POST', url: '/api/cart/items',
    headers: { cookie: user.cookie }, payload: { productId: rows[0].id, quantity: 1 },
  });

  const myRes = await app.inject({ method: 'GET', url: '/api/coupons/my', headers: { cookie: user.cookie } });
  const coupon = myRes.json().data.items.find((c) => c.campaignName === 'کمپین T4');
  const quote = await app.inject({
    method: 'GET', url: `/api/cart/quote?couponId=${coupon.id}`,
    headers: { cookie: user.cookie },
  });
  // 50% فقط روی ۲ تیشرت = 100000؛ وینیل تخفیف نمی‌گیرد
  assert.strictEqual(quote.json().data.discountAmount, 100000);
  assert.strictEqual(quote.json().data.total, 600000);
});

test('coupon abuse: another user claiming an already-claimed code', async () => {
  const d = await makeCampaign(
    { name: 'کمپین T5', discountType: 'fixed', discountValue: 1, codeCount: 1, expiresAt: new Date(Date.now() + 86400000 * 30).toISOString() },
    admin.cookie
  );
  await app.inject({
    method: 'POST', url: '/api/coupons/claim',
    headers: { cookie: user.cookie }, payload: { code: d.codes[0] },
  });
  const other = await registerUser(app);
  const res = await app.inject({
    method: 'POST', url: '/api/coupons/claim',
    headers: { cookie: other.cookie }, payload: { code: d.codes[0] },
  });
  assert.strictEqual(res.statusCode, 409, res.body);
  assert.strictEqual(res.json().error.code, 'COUPON_TAKEN');
});

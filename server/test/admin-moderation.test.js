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

test('RBAC: anonymous → 401, customer → 403 on admin routes', async () => {
  const anon = await app.inject({ method: 'GET', url: '/api/admin/dashboard' });
  assert.strictEqual(anon.statusCode, 401);
  const cust = await app.inject({ method: 'GET', url: '/api/admin/dashboard', headers: { cookie: user.cookie } });
  assert.strictEqual(cust.statusCode, 403);
  const ok = await app.inject({ method: 'GET', url: '/api/admin/dashboard', headers: { cookie: admin.cookie } });
  assert.strictEqual(ok.statusCode, 200);
  assert.ok(ok.json().data.users.total >= 1);
});

test('admin orders: list, detail, valid + invalid status transitions', async () => {
  await app.inject({
    method: 'POST', url: '/api/cart/items', headers: { cookie: user.cookie },
    payload: { productId: tshirtId, quantity: 1 },
  });
  const order = await app.inject({
    method: 'POST', url: '/api/orders', headers: { cookie: user.cookie },
    payload: { customerName: 'کاربر', customerPhone: '09120000001', shippingAddress: 'تهران، خیابان تست ۱۲' },
  });
  const oid = order.json().data.id;

  const list = await app.inject({ method: 'GET', url: '/api/admin/orders', headers: { cookie: admin.cookie } });
  assert.ok(list.json().data.items.length >= 1);

  // pending → shipped: invalid transition
  const bad = await app.inject({
    method: 'PATCH', url: `/api/admin/orders/${oid}/status`, headers: { cookie: admin.cookie },
    payload: { status: 'shipped' },
  });
  assert.strictEqual(bad.statusCode, 400);
  assert.strictEqual(bad.json().error.code, 'INVALID_TRANSITION');

  // pending → confirmed: valid, actor recorded
  const good = await app.inject({
    method: 'PATCH', url: `/api/admin/orders/${oid}/status`, headers: { cookie: admin.cookie },
    payload: { status: 'confirmed', note: 'test' },
  });
  assert.strictEqual(good.statusCode, 200);
  const detail = good.json().data;
  assert.strictEqual(detail.status, 'confirmed');
  const last = detail.history[detail.history.length - 1];
  assert.strictEqual(last.toStatus, 'confirmed');
  assert.strictEqual(last.actor, 'Admin');
});

test('admin users: list + change role + self-demotion blocked', async () => {
  const list = await app.inject({ method: 'GET', url: '/api/admin/users', headers: { cookie: admin.cookie } });
  assert.ok(list.json().data.items.length >= 2);

  const target = list.json().data.items.find((u) => u.email.startsWith('u') && u.role === 'customer');
  const up = await app.inject({
    method: 'PATCH', url: `/api/admin/users/${target.id}`, headers: { cookie: admin.cookie },
    payload: { role: 'admin' },
  });
  assert.strictEqual(up.statusCode, 200);
  assert.strictEqual(up.json().data.role, 'admin');

  // admin نمی‌تواند خودش را customer کند
  const adminId = list.json().data.items.find((u) => u.email === 'admin@test.ir').id;
  const self = await app.inject({
    method: 'PATCH', url: `/api/admin/users/${adminId}`, headers: { cookie: admin.cookie },
    payload: { role: 'customer' },
  });
  assert.strictEqual(self.statusCode, 403);
});

test('contact: user submits → admin sees, marks read, deletes', async () => {
  const sub = await app.inject({
    method: 'POST', url: '/api/contact',
    payload: { name: 'مهمان', email: 'guest@test.ir', message: 'سلام، یه سوال داشتم درباره ارسال' },
  });
  assert.strictEqual(sub.statusCode, 201, sub.body);

  const list = await app.inject({ method: 'GET', url: '/api/admin/messages', headers: { cookie: admin.cookie } });
  const msg = list.json().data.items.find((m) => m.email === 'guest@test.ir');
  assert.ok(msg);
  assert.strictEqual(msg.status, 'unread');

  const mark = await app.inject({
    method: 'PATCH', url: `/api/admin/messages/${msg.id}`, headers: { cookie: admin.cookie },
    payload: { status: 'read' },
  });
  assert.strictEqual(mark.statusCode, 200);

  const del = await app.inject({ method: 'DELETE', url: `/api/admin/messages/${msg.id}`, headers: { cookie: admin.cookie } });
  assert.strictEqual(del.statusCode, 200);
});

test('CMS: admin sets content → public GET reflects it', async () => {
  const put = await app.inject({
    method: 'PUT', url: '/api/admin/content/footer_note', headers: { cookie: admin.cookie },
    payload: { value: '© تست ۱۴۰۵ — همه چی مایعه' },
  });
  assert.strictEqual(put.statusCode, 200);

  const pub = await app.inject({ method: 'GET', url: '/api/content' });
  assert.strictEqual(pub.json().data.footer_note, '© تست ۱۴۰۵ — همه چی مایعه');

  const badKey = await app.inject({
    method: 'PUT', url: '/api/admin/content/hacker_key', headers: { cookie: admin.cookie },
    payload: { value: 'x' },
  });
  assert.strictEqual(badKey.statusCode, 400);
});

test('reviews: only purchasers can review; admin moderates', async () => {
  // بدون خرید (کاربر جدید — user قبلی در تست orders خرید کرده)
  const stranger = await registerUser(app);
  const noBuy = await app.inject({
    method: 'POST', url: `/api/products/${tshirtId}/reviews`, headers: { cookie: stranger.cookie },
    payload: { rating: 5, body: 'عالی بود واقعاً' },
  });
  assert.strictEqual(noBuy.statusCode, 400);
  assert.strictEqual(noBuy.json().error.code, 'NOT_PURCHASED');

  // خرید و بعد نظر
  await app.inject({
    method: 'POST', url: '/api/cart/items', headers: { cookie: user.cookie },
    payload: { productId: tshirtId, quantity: 1 },
  });
  await app.inject({
    method: 'POST', url: '/api/orders', headers: { cookie: user.cookie },
    payload: { customerName: 'کاربر', customerPhone: '09120000001', shippingAddress: 'تهران، خیابان تست ۱۲' },
  });
  const review = await app.inject({
    method: 'POST', url: `/api/products/${tshirtId}/reviews`, headers: { cookie: user.cookie },
    payload: { rating: 4, body: 'کیفیت چاپ خوب بود' },
  });
  assert.strictEqual(review.statusCode, 201);
  const rid = review.json().data.id;

  // هنوز approved نیست → در لیست public نیست
  const pub = await app.inject({ method: 'GET', url: `/api/products/${tshirtId}/reviews` });
  assert.strictEqual(pub.json().data.items.length, 0);

  // admin approve
  const approve = await app.inject({
    method: 'PATCH', url: `/api/admin/reviews/${rid}`, headers: { cookie: admin.cookie },
    payload: { isApproved: true },
  });
  assert.strictEqual(approve.statusCode, 200);
  const pub2 = await app.inject({ method: 'GET', url: `/api/products/${tshirtId}/reviews` });
  assert.strictEqual(pub2.json().data.items.length, 1);

  // دوباره نظر با همان کاربر → 400
  const dup = await app.inject({
    method: 'POST', url: `/api/products/${tshirtId}/reviews`, headers: { cookie: user.cookie },
    payload: { rating: 5, body: 'یه بار دیگه نظر بدم' },
  });
  assert.strictEqual(dup.statusCode, 400);
});

test('questions: guest can ask; admin answers + publishes', async () => {
  const q = await app.inject({
    method: 'POST', url: `/api/products/${tshirtId}/questions`,
    payload: { question: 'سایزش فیت است یا oversize؟', authorName: 'مهمان' },
  });
  assert.strictEqual(q.statusCode, 201, q.body);

  const list = await app.inject({ method: 'GET', url: '/api/admin/questions', headers: { cookie: admin.cookie } });
  const item = list.json().data.items[0];
  assert.strictEqual(item.question, 'سایزش فیت است یا oversize؟');

  const ans = await app.inject({
    method: 'PATCH', url: `/api/admin/questions/${item.id}`, headers: { cookie: admin.cookie },
    payload: { answer: 'فیت معمولی است.', isPublished: true },
  });
  assert.strictEqual(ans.statusCode, 200);

  const pub = await app.inject({ method: 'GET', url: `/api/products/${tshirtId}/questions` });
  assert.strictEqual(pub.json().data.items.length, 1);
  assert.strictEqual(pub.json().data.items[0].answer, 'فیت معمولی است.');
});

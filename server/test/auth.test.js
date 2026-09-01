'use strict';
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const { resetDb, createApp, registerUser, loginUser, cookieFrom } = require('./helpers');

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

test('register: 201 + set-cookie sid + user without password', async () => {
  const { res, email } = await registerUser(app);
  const body = res.json();
  assert.strictEqual(body.success, true);
  assert.strictEqual(body.data.email, email);
  assert.strictEqual(body.data.password, undefined);
  const sc = Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : res.headers['set-cookie'];
  assert.match(sc, /sid=.*HttpOnly/i);
});

test('register: duplicate email → 409 EMAIL_TAKEN', async () => {
  const { email } = await registerUser(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'dup', email, password: 'Passw0rd!x' },
  });
  assert.strictEqual(res.statusCode, 409);
  assert.strictEqual(res.json().error.code, 'EMAIL_TAKEN');
});

test('register: weak password → 400 VALIDATION_ERROR (Persian details)', async () => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name: 'x', email: 'weak@test.ir', password: '123' },
  });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.json().error.code, 'VALIDATION_ERROR');
});

test('login: wrong password → 401 generic (no user enumeration)', async () => {
  const { email } = await registerUser(app);
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password: 'WrongPass1!' },
  });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.json().error.code, 'UNAUTHORIZED');
  const m = res.json().error.message;
  assert.ok(!m.includes(email), 'email must not leak in message');
});

test('me: with cookie → user data; without → 401', async () => {
  const { email, cookie } = await registerUser(app);
  const okRes = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
  assert.strictEqual(okRes.statusCode, 200);
  assert.strictEqual(okRes.json().data.email, email);

  const noRes = await app.inject({ method: 'GET', url: '/api/auth/me' });
  assert.strictEqual(noRes.statusCode, 401);
});

test('logout: session revoked → me 401 after', async () => {
  const { cookie } = await registerUser(app);
  const lo = await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
  assert.strictEqual(lo.statusCode, 200);
  const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
  assert.strictEqual(me.statusCode, 401);
});

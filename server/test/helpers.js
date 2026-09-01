'use strict';
/**
 * test/helpers.js — زیرساخت تست: app روی DB تستی، reset، seed حداقلی.
 * محیط تست را باید قبل از require config ست کنیم.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST || 'postgres://omid:omid@127.0.0.1:5432/omid_stare_test';
// rate limit در تست غیرفعال‌گونه (عدد خیلی بالا) تا تست‌ها به هم نخورند
process.env.RL_GLOBAL = '100000';
process.env.RL_AUTH = '100000';
process.env.RL_COUPON_CLAIM = '100000';
process.env.RL_CONTACT = '100000';
process.env.RL_ORDER = '100000';

const { buildApp } = require('../src/app');
const { pool } = require('../src/db/client');
const { migrate } = require('../src/db/migrate');

const ALL_TABLES = [
  'order_status_history', 'order_items', 'orders', 'cart_items', 'carts',
  'user_wishlist', 'reviews', 'product_questions', 'contact_messages',
  'notifications', 'coupons', 'coupon_campaigns', 'sessions',
  'album_tracks', 'albums', 'products', 'users', 'site_content',
].join(', ');

/** TRUNCATE همه جدول‌ها + seed حداقلی (۲ محصول، ۱ آلبوم، admin) */
async function resetDb() {
  await pool.query(`TRUNCATE ${ALL_TABLES} RESTART IDENTITY CASCADE`);
  await pool.query(
    `INSERT INTO app_sequences (key, last_value) VALUES ('order_number', 0)
     ON CONFLICT (key) DO UPDATE SET last_value = 0`
  );

  const argon2 = require('argon2');
  const adminHash = await argon2.hash('Admin1405!', { type: argon2.argon2id });
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin', 'admin@test.ir', $1, 'admin')`,
    [adminHash]
  );

  const products = [
    {
      slug: 't-shirt', name: 'تیشرت تست', nameEn: 'Test T-Shirt',
      price: 100000, compareAtPrice: null, stock: 10, category: 'پوشاک',
      image: 'images/t.jpg', sizes: ['M', 'L'],
      colors: [{ name: 'مشکی', hex: '#0a0a0f' }],
    },
    {
      slug: 'vinyl', name: 'وینیل تست', nameEn: 'Test Vinyl',
      price: 500000, compareAtPrice: null, stock: 2, category: 'وینیل',
      image: 'images/v.jpg', sizes: ['180g'],
      colors: [{ name: 'ماژنتا', hex: '#ff2d95' }],
    },
  ];
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (slug, name, name_en, price, compare_at_price, stock, category, image, sizes, colors)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb)`,
      [p.slug, p.name, p.nameEn, p.price, p.compareAtPrice, p.stock, p.category, p.image,
       JSON.stringify(p.sizes), JSON.stringify(p.colors)]
    );
  }

  const { rows: aRows } = await pool.query(
    `INSERT INTO albums (title, title_fa, year, genre, cover_image)
     VALUES ('Test Album', 'آلبوم تست', 1400, 'PSYCH', 'images/a.jpg')
     RETURNING id`
  );
  await pool.query(
    `INSERT INTO album_tracks (album_id, track_number, title, duration)
     VALUES ($1, 1, 'ترک یک', 300)`,
    [aRows[0].id]
  );
}

async function createApp() {
  await migrate(); // idempotent
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}

function cookieFrom(res) {
  const sc = res.headers['set-cookie'];
  if (!sc) return null;
  const raw = Array.isArray(sc) ? sc.join(', ') : sc;
  const m = raw.match(/sid=([^;]+)/);
  return m ? `sid=${m[1]}` : null;
}

async function registerUser(app, { name = 'کاربر تست', email, password = 'Passw0rd!x' } = {}) {
  const mail = email || `u${Math.random().toString(36).slice(2, 10)}@test.ir`;
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/register',
    payload: { name, email: mail, password },
  });
  if (res.statusCode !== 201) throw new Error(`register failed: ${res.statusCode} ${res.body}`);
  return { email: mail, password, cookie: cookieFrom(res), res };
}

async function loginUser(app, email, password) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });
  if (res.statusCode !== 200) throw new Error(`login failed: ${res.statusCode} ${res.body}`);
  return { cookie: cookieFrom(res), res };
}

module.exports = { resetDb, createApp, cookieFrom, registerUser, loginUser };

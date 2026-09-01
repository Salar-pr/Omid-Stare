'use strict';
/**
 * Config — محیط را یکبار می‌خواند و یک object validate شده export می‌کند.
 * همه جا از این ماژول استفاده کن، مستقیم از process.env نخوان.
 */
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const SERVER_ROOT = path.resolve(__dirname, '../..'); // .../server
const PROJECT_ROOT = path.resolve(SERVER_ROOT, '..'); // ریشه repo

function int(v, d) {
  const n = parseInt(v == null ? '' : String(v), 10);
  return Number.isFinite(n) ? n : d;
}
function boolish(v, d) {
  if (v === undefined || v === '') return d;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';
const PORT = int(process.env.PORT, 3000);

const config = {
  env: NODE_ENV,
  isProd,
  port: PORT,
  host: process.env.HOST || '0.0.0.0',
  appUrl: (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/+$/, ''),

  databaseUrl:
    process.env.DATABASE_URL || 'postgres://omid:omid@localhost:5432/omid_stare',
  dbPool: {
    max: int(process.env.DB_POOL_MAX, 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  },

  // Auth / Session
  sessionTtlDays: int(process.env.SESSION_TTL_DAYS, 7),
  cookieSecure: process.env.COOKIE_SECURE !== undefined && process.env.COOKIE_SECURE !== ''
    ? boolish(process.env.COOKIE_SECURE, isProd)
    : isProd,
  sameSite: isProd ? 'strict' : 'lax',
  cookieName: 'sid',

  // Admin bootstrap
  adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',

  // Notifications: "log,admin" — کانال‌های بعدی بدون لمس order service اضافه می‌شوند
  notificationChannels: (process.env.NOTIFICATION_CHANNELS || 'log,admin')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  // Media
  uploadDir: path.isAbsolute(process.env.UPLOAD_DIR || '')
    ? process.env.UPLOAD_DIR
    : path.resolve(SERVER_ROOT, process.env.UPLOAD_DIR || './uploads'),
  maxAvatarBytes: int(process.env.MAX_AVATAR_BYTES, 2 * 1024 * 1024),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),

  // Static frontend
  frontendDir: path.isAbsolute(process.env.FRONTEND_DIR || '')
    ? process.env.FRONTEND_DIR
    : path.resolve(SERVER_ROOT, process.env.FRONTEND_DIR || '..'),

  // Pricing
  shippingAmount: int(process.env.SHIPPING_AMOUNT, 0),

  // Rate limits (per window)
  rateLimit: {
    global: int(process.env.RL_GLOBAL, 300),
    auth: int(process.env.RL_AUTH, 10),
    couponClaim: int(process.env.RL_COUPON_CLAIM, 8),
    contact: int(process.env.RL_CONTACT, 6),
    order: int(process.env.RL_ORDER, 10),
  },

  testDatabaseUrl: process.env.DATABASE_URL_TEST || 'postgres://omid:omid@localhost:5432/omid_stare_test',
};

module.exports = config;

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
  // برای امضای کوکی — قبلاً hard-code بود؛ حالا از env خوانده می‌شود (رفتار پیش‌فرض همان قبلی)
  cookieSecret: process.env.COOKIE_SECRET || undefined,
  cookieSecure: process.env.COOKIE_SECURE !== undefined && process.env.COOKIE_SECURE !== ''
    ? boolish(process.env.COOKIE_SECURE, isProd)
    : isProd,
  // اجازه‌ی نمایش سایت داخل iframe دامنه‌ی دیگر (محیط پیش‌نمایش/دمو).
  // پیش‌فرض: خاموش در production، روشن در غیر production.
  // با ALLOW_EMBEDDING=true/false می‌توان صریح تعیین کرد.
  allowEmbedding: process.env.ALLOW_EMBEDDING !== undefined && process.env.ALLOW_EMBEDDING !== ''
    ? boolish(process.env.ALLOW_EMBEDDING, false)
    : !isProd,
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

/**
 * بررسی امنیتی هنگام بالا آمدن — فقط در production.
 * جلوی دیپلوی با مقادیر پیش‌فرض/ناامن را می‌گیرد (fail-fast بهتر از رخنه‌ی خاموش است).
 */
function assertProductionSafety(c) {
  if (!c.isProd) return;
  const errors = [];

  if (!c.cookieSecret || String(c.cookieSecret).length < 32) {
    errors.push('COOKIE_SECRET تنظیم نشده یا کوتاه‌تر از ۳۲ کاراکتر است.');
  }
  if (/omid:omid@/.test(c.databaseUrl)) {
    errors.push('DATABASE_URL هنوز رمز پیش‌فرض «omid:omid» را دارد.');
  }
  if (!c.cookieSecure) {
    errors.push('COOKIE_SECURE در production باید true باشد (کوکی فقط روی HTTPS).');
  }
  if (c.adminPassword && /ChangeMe/i.test(c.adminPassword)) {
    errors.push('ADMIN_PASSWORD هنوز مقدار نمونه‌ی ChangeMe است.');
  }

  if (errors.length) {
    throw new Error(
      '\n🔒 راه‌اندازی متوقف شد — تنظیمات ناامن در production:\n' +
        errors.map((e) => '  ✗ ' + e).join('\n') +
        '\n\nاین مقادیر را در server/.env درست کن و دوباره اجرا کن.\n' +
        'برای ساخت secret:  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n'
    );
  }
}

assertProductionSafety(config);

module.exports = config;

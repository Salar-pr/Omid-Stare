#!/usr/bin/env node
'use strict';
/**
 * scripts/db-embedded.js — PostgreSQL جاسازیشده برای اجرای لوکال (بدون نصب سرویس، بدون Docker).
 *
 * برای چی خوبه؟
 *   اگه نصب PostgreSQL روی سیستم برایت سخت است (مخصوصاً توی ویندوز) یا اصلاً
 *   نمی‌خواهی سرویس جدا نصب کنی، این اسکریپت یک PostgreSQL واقعی را با همین
 *   credentialهای پیش‌فرض پروژه (omid / omid) بالا می‌آورد؛ داده‌ها داخل یک
 *   پوشه (server/.pgdata) ذخیره می‌شوند — مثل همان «فایل دیتابیس»‌ای که
 *   توی SQLite جنگو هست؛ پاک کردن پوشه = ریست کامل دیتابیس.
 *
 * پیش‌نیاز (یک‌بار):  npm install        ← خود embedded-postgres در devDependencies هست
 * اجرا:              npm run db:embedded ← در یک ترمینال (تا وقتی باز است دیتابیس بالاست)
 * سپس در ترمینال دوم: npm run dev        ← سایت روی http://localhost:3000
 *
 * اسکریپت هنگام بالا آمدن، migrate و seed را هم خودکار اجرا می‌کند (هر دو
 * idempotent هستند و چندبار اجراشدنشان بی‌خطر است) تا تازه‌کارها فقط دو
 * دستور ساده بزنند.
 *
 * متغیرهای محیطی (اختیاری — معمولاً لازم نیست):
 *   EMBEDDED_PG_DIR       مسیر پوشه‌ی داده (پیش‌فرض: server/.pgdata)
 *   EMBEDDED_PG_PORT      پورت (پیش‌فرض: پورت DATABASE_URL در server/.env یا 5432)
 *   EMBEDDED_PG_VERBOSE=1 برای دیدن لاگ کامل postgres
 */
const { spawnSync } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');

const SERVER_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(SERVER_ROOT, '.env');

/* ---------- خواندن تنظیمات DATABASE_URL از server/.env (اگر هست) ---------- */
function readEnvFile() {
  const out = {};
  if (!fs.existsSync(ENV_FILE)) return out;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

function parseDbUrl(url) {
  try {
    const u = new URL(url);
    return {
      port: u.port ? Number(u.port) : 5432,
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      db: u.pathname.replace(/^\//, ''),
    };
  } catch {
    return null;
  }
}

const envFile = readEnvFile();
const parsedUrl = parseDbUrl(envFile.DATABASE_URL || '');

const DB_DIR = process.env.EMBEDDED_PG_DIR
  ? path.resolve(process.env.EMBEDDED_PG_DIR)
  : path.join(SERVER_ROOT, '.pgdata');
const PORT = process.env.EMBEDDED_PG_PORT ? Number(process.env.EMBEDDED_PG_PORT) : parsedUrl?.port || 5432;
const USER = process.env.EMBEDDED_PG_USER || parsedUrl?.user || 'omid';
const PASSWORD = process.env.EMBEDDED_PG_PASSWORD || parsedUrl?.password || 'omid';
const DB_APP = process.env.EMBEDDED_PG_DB || parsedUrl?.db || 'omid_stare';
const DB_TEST = process.env.EMBEDDED_PG_TEST_DB || `${DB_APP}_test`;
const VERBOSE = process.env.EMBEDDED_PG_VERBOSE === '1';

const log = (msg) => console.log(`\x1b[36m[db]\x1b[0m ${msg}`);

function portInUse(port) {
  return new Promise((resolve) => {
    const sock = net.connect({ port, host: '127.0.0.1' });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => resolve(false));
  });
}

function runNodeScript(scriptRel, args = []) {
  log(`اجرای ${scriptRel} ...`);
  const res = spawnSync(process.execPath, [scriptRel, ...args], {
    cwd: SERVER_ROOT,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  });
  return res.status === 0;
}

(async () => {
  if (!fs.existsSync(DB_DIR) || !fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (await portInUse(PORT)) {
    console.error(
      `\x1b[31m[db]\x1b[0m پورت ${PORT} از قبل اشغال است!` +
        `\n  یک PostgreSQL دیگر روی این پورت در حال اجراست؟ برای استفاده از همین اسکریپت:\n` +
        `   - یا آن سرویس را خاموش کن،\n` +
        `   - یا پورت دیگری بده و DATABASE_URL را در server/.env هماهنگ کن:\n` +
        `       EMBEDDED_PG_PORT=5433  (و در server/.env:  DATABASE_URL=postgres://omid:omid@localhost:5433/${DB_APP})`
    );
    process.exit(1);
  }

  log('در حال بارگذاری PostgreSQL جاسازیشده (embedded-postgres) …');
  const { default: EmbeddedPostgres } = await import('embedded-postgres');

  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    authMethod: 'password',
    persistent: true,
    // مهم برای ویندوز: بدون این، initdb از encoding سیستمی استفاده می‌کند
    // (روی ویندوزِ فارسی/انگلیسی معمولاً WIN1252) و template0/template1 هم
    // همان می‌شوند. نتیجه: هر متن فارسی موقع migration با خطای
    // «has no equivalent in encoding WIN1252» رد می‌شود.
    initdbFlags: ['--encoding=UTF8', '--locale=C'],
    onLog: (msg) => { if (VERBOSE) console.log('  [pg]', msg); },
    onError: (e) => { if (VERBOSE) console.error('  [pg]', e); },
  });

  const isFresh = !fs.existsSync(path.join(DB_DIR, 'PG_VERSION'));

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('  🐘 PostgreSQL جاسازیشده — OMID RASTAR (توسعه‌ی لوکال)');
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`  پوشه‌ی داده : ${DB_DIR}`);
  console.log(`  پورت        : ${PORT}`);
  console.log(`  یوزر / رمز  : ${USER} / ${PASSWORD}`);
  console.log(`  دیتابیس‌ها  : ${DB_APP} , ${DB_TEST}`);
  console.log(`  حالت        : ${isFresh ? 'ساخت اولیه (initialise)…' : 'داده‌ی موجود — بالا آوردن…'}`);
  console.log('──────────────────────────────────────────────────────────────\n');

  try {
    if (isFresh) await pg.initialise();
    await pg.start();
    log(`PostgreSQL روی پورت ${PORT} بالا آمد ✅`);
  } catch (err) {
    console.error('\x1b[31m[db]\x1b[0m شروع PostgreSQL ناموفق بود:', err?.message || err);
    process.exit(1);
  }

  // ---------- ساختن دیتابیس‌ها (اگر نبودند) ----------
  try {
    const client = pg.getPgClient('postgres');
    await client.connect();
    const exists = async (name) => {
      const r = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
      return r.rowCount > 0;
    };
    for (const dbName of [DB_APP, DB_TEST]) {
      if (await exists(dbName)) {
        // اگر دیتابیس قبلاً با encoding اشتباه ساخته شده باشد (روی ویندوز
        // معمولاً WIN1252)، متن فارسی داخلش جا نمی‌شود و migration با خطای
        // «has no equivalent in encoding WIN1252» شکست می‌خورد. پس چک می‌کنیم.
        const enc = await client.query(
          'SELECT pg_encoding_to_char(encoding) AS e FROM pg_database WHERE datname = $1',
          [dbName]
        );
        const current = enc.rows[0] && enc.rows[0].e;
        if (current !== 'UTF8') {
          console.error(
            `\x1b[31m[db]\x1b[0m دیتابیس «${dbName}» با encoding نامناسب «${current}» ساخته شده.` +
              `\n  متن فارسی در آن ذخیره نمی‌شود. پوشه‌ی داده را پاک کنید تا از نو ساخته شود:\n` +
              `\n      ویندوز:      rmdir /s /q .pgdata` +
              `\n      مک/لینوکس:   rm -rf .pgdata\n` +
              `\n  بعد دوباره «npm run db:embedded» را بزنید.`
          );
          await client.end();
          await pg.stop();
          process.exit(1);
        }
        log(`دیتابیس «${dbName}» از قبل هست ✅`);
      } else {
        // صریحاً UTF8 می‌سازیم. TEMPLATE template0 لازم است چون template1
        // ممکن است خودش encoding سیستمی (مثلاً WIN1252) داشته باشد و
        // آن را به دیتابیس جدید تحمیل کند.
        await client.query(
          `CREATE DATABASE "${dbName}" WITH ENCODING 'UTF8' TEMPLATE template0`
        );
        log(`دیتابیس «${dbName}» ساخته شد (UTF8) ✅`);
      }
    }
    await client.end();
  } catch (err) {
    console.error('\x1b[31m[db]\x1b[0m ساختن دیتابیس ناموفق بود:', err?.message || err);
    await pg.stop();
    process.exit(1);
  }

  // ---------- migrate + seed (خودکار و idempotent) ----------
  const okMigrate = runNodeScript('scripts/migrate.js');
  if (!okMigrate) {
    console.error('\x1b[31m[db]\x1b[0m migration شکست خورد — لاگ بالا را ببین.');
    await pg.stop();
    process.exit(1);
  }
  const okSeed = runNodeScript('scripts/seed.js');
  if (!okSeed) {
    console.error('\x1b[31m[db]\x1b[0m seed شکست خورد — لاگ بالا را ببین.');
    await pg.stop();
    process.exit(1);
  }

  console.log('\n──────────────────────────────────────────────────────────────');
  console.log('  ✅ دیتابیس کاملاً آماده‌ست! حالا در یک ترمینالِ دیگر:');
  console.log('');
  console.log('      cd server && npm run dev');
  console.log('');
  console.log('  و بعد مرورگر:  http://localhost:3000');
  console.log('  (برای خاموش‌کردن دیتابیس همین‌جا Ctrl+C بزن.)');
  console.log('──────────────────────────────────────────────────────────────\n');

  // زنده نگه داشتن پروسه تا Ctrl+C
  const timer = setInterval(() => {}, 60_000);
  const shutdown = async (signal) => {
    console.log(`\n[db] ${signal} — در حال خاموش‌کردن دیتابیس …`);
    clearInterval(timer);
    try { await pg.stop(); } catch { /* noop */ }
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
})().catch((err) => {
  console.error('[db] خطای غیرمنتظره:', err);
  process.exit(1);
});

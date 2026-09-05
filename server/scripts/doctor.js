#!/usr/bin/env node
'use strict';
/**
 * scripts/doctor.js — عیب‌یابی سریع «چرا سایت خطای ۵۰۰ می‌دهد؟»
 * اجرا:  npm run doctor
 */
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => console.log('  ❌ ' + m);
const info = (m) => console.log('     ' + m);

function readEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return null;
  const out = {};
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    if (line.trim().startsWith('#')) continue;
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function portOpen(port, host = '127.0.0.1') {
  return new Promise((res) => {
    const s = new net.Socket();
    s.setTimeout(1500);
    s.once('connect', () => { s.destroy(); res(true); });
    s.once('timeout', () => { s.destroy(); res(false); });
    s.once('error', () => { s.destroy(); res(false); });
    s.connect(port, host);
  });
}

(async () => {
  console.log('\n══════════ عیب‌یابی OMID RASTAR ══════════\n');

  console.log('۱) نسخه‌ی Node');
  const major = Number(process.versions.node.split('.')[0]);
  major >= 20 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} — حداقل ۲۰ لازم است`);

  console.log('\n۲) فایل .env');
  const env = readEnv();
  if (!env) { bad('server/.env پیدا نشد!'); info('راه‌حل: cp .env.example .env'); }
  else ok('.env موجود است');

  console.log('\n۳) پوشه‌ی node_modules');
  fs.existsSync(path.join(ROOT, 'node_modules'))
    ? ok('نصب شده')
    : bad('نصب نشده — دستور «npm install» را بزنید');

  console.log('\n۴) دیتابیس (مهم‌ترین بخش)');
  const url = (env && env.DATABASE_URL) || '';
  let port = 5432;
  try { const u = new URL(url); if (u.port) port = Number(u.port); } catch {}
  info(`آدرس: ${url || '(تعریف نشده)'}`);
  const up = await portOpen(port);
  if (!up) {
    bad(`هیچ چیزی روی پورت ${port} گوش نمی‌دهد — یعنی دیتابیس بالا نیست`);
    info('');
    info('👈 علت خطاهای ۵۰۰ همین است.');
    info('   یک ترمینال جداگانه باز کنید و بزنید:');
    info('');
    info('       npm run db:embedded');
    info('');
    info('   صبر کنید تا پیام «PostgreSQL روی پورت 5432 بالا آمد ✅» بیاید،');
    info('   آن ترمینال را باز بگذارید، و بعد در این ترمینال «npm start» بزنید.');
  } else {
    ok(`پورت ${port} باز است`);
    try {
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 4000 });
      const r = await pool.query('SELECT COUNT(*)::int AS n FROM products');
      ok(`اتصال موفق — ${r.rows[0].n} محصول در دیتابیس`);
      if (r.rows[0].n === 0) {
        bad('دیتابیس خالی است — دستور «npm run seed» را بزنید');
      }
      await pool.end();
    } catch (e) {
      bad('پورت باز است ولی اتصال/کوئری شکست خورد');
      info('پیام: ' + e.message);
      if (/relation .* does not exist/i.test(e.message)) {
        info('👈 جدول‌ها ساخته نشده‌اند. بزنید: npm run migrate && npm run seed');
      } else if (/password|auth/i.test(e.message)) {
        info('👈 نام کاربری/رمز اشتباه است، یا یک PostgreSQL دیگر روی همین پورت است.');
        info('   اگر پستگرس جداگانه نصب دارید، موقتاً متوقفش کنید.');
      }
    }
  }

  console.log('\n════════════════════════════════════════\n');
})();

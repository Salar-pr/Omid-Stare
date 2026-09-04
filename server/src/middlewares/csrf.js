'use strict';
/**
 * middlewares/csrf — دفاع لایه‌دوم در برابر CSRF با بررسی Origin/Referer.
 *
 * چرا لازم است؟
 *   احراز هویت این پروژه کوکی‌محور است. SameSite (strict در production) خط دفاع
 *   اول است، ولی به تنهایی کافی نیست: مرورگرهای قدیمی آن را نادیده می‌گیرند و
 *   بعضی سناریوهای same-site هم از آن عبور می‌کنند. این بررسی، درخواست‌های
 *   state-changing را که از یک مبدأ بیگانه آمده‌اند رد می‌کند.
 *
 * منطق:
 *   - فقط روی متدهای تغییردهنده (POST/PUT/PATCH/DELETE) اعمال می‌شود.
 *   - GET/HEAD/OPTIONS آزادند (نباید state عوض کنند).
 *   - اگر Origin و Referer هر دو نبودند (مثل curl یا اپ موبایل) رد نمی‌کنیم،
 *     چون CSRF ذاتاً حمله‌ی مبتنی بر مرورگر است و مرورگر همیشه Origin می‌فرستد.
 */
const config = require('../config');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** لیست میزبان‌های مجاز: APP_URL + هر چیزی که در CSRF_ALLOWED_ORIGINS آمده */
function allowedHosts() {
  const list = [];
  try {
    list.push(new URL(config.appUrl).host);
  } catch (e) {
    /* ignore */
  }
  const extra = (process.env.CSRF_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const o of extra) {
    try {
      list.push(new URL(o).host);
    } catch (e) {
      list.push(o); // اجازه‌ی دادن host خام
    }
  }
  return list;
}

function hostOf(value) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch (e) {
    return null;
  }
}

async function csrfGuard(req, reply) {
  if (SAFE_METHODS.has(req.method)) return;

  const originHost = hostOf(req.headers.origin);
  const refererHost = hostOf(req.headers.referer);

  // نه Origin نه Referer → کلاینت غیرمرورگری (curl / موبایل). CSRF مصداق ندارد.
  if (!originHost && !refererHost) return;

  const claimed = originHost || refererHost;
  const allowed = new Set(allowedHosts());
  // میزبان خود درخواست را هم مجاز بدان (سازگار با dev و دامنه‌های پیش‌نمایش)
  if (req.headers.host) allowed.add(req.headers.host);

  if (allowed.has(claimed)) return;

  req.log.warn(
    { claimed, host: req.headers.host, url: req.url, ip: req.ip },
    'csrf: cross-origin state-changing request blocked'
  );
  return reply.code(403).send({
    success: false,
    error: {
      code: 'CSRF_BLOCKED',
      message: 'درخواست از مبدأ نامعتبر — دوباره از خود سایت تلاش کن.',
    },
  });
}

module.exports = { csrfGuard };

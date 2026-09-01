'use strict';
/**
 * notification.service — کانال‌محور، قابل گسترش.
 *
 * Order service فقط emit('order_created', payload) می‌کند. کانال‌ها از config
 * خوانده می‌شوند (NOTIFICATION_CHANNELS=log,admin). برای اضافه کردن Telegram/Email/SMS
 * کافی است یک channel جدید با همین امضا register شود — order service دست نمی‌خورد.
 */
const config = require('../config');
const { pool } = require('../db/client');

const channels = {
  /** log — server log (هرگز با اطلاعات حساس) */
  async log(event, payload) {
    console.log(`[notify:${event}]`, JSON.stringify(payload));
  },

  /** admin — نوتیفیکیشن داخل admin dashboard (برای فروشنده) */
  async admin(event, payload) {
    try {
      await pool.query(
        'INSERT INTO notifications (type, payload) VALUES ($1, $2)',
        [event, JSON.stringify(payload || {})]
      );
    } catch (err) {
      console.error('[notify:admin] failed:', err.message);
    }
  },

  // ---- بعداً همین امضا: telegram / email / sms ----
  // async telegram(event, payload) { ... }
};

/**
 * ارسال رویداد به همه کانال‌های فعال. هیچ کانالی نباید crash کل flow را کند.
 */
async function emit(event, payload = {}) {
  for (const name of config.notificationChannels) {
    const fn = channels[name];
    if (!fn) {
      console.warn(`[notify] unknown channel "${name}" skipped`);
      continue;
    }
    try {
      await fn(event, payload);
    } catch (err) {
      // خطای یک کانال نباید سفارش را خراب کند
      console.error(`[notify:${name}] channel error:`, err.message);
    }
  }
}

module.exports = { emit, channels };

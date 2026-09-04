'use strict';
/**
 * admin/fulfillment.service — نمای «وضعیت ارسال سفارش‌ها»
 *
 * هدف: ادمین در یک نگاه ببیند چه سفارش‌هایی ارسال شده و چه سفارش‌هایی
 * هنوز مانده‌اند و باید رسیدگی شوند.
 *
 * تعریف‌ها (مهم — منطق کسب‌وکار):
 *   ارسال‌شده  = status IN ('shipped', 'delivered')   → کار انبار تمام شده
 *   در انتظار  = status IN ('pending','confirmed','processing') → هنوز نرفته
 *   لغوشده     = status = 'cancelled'                 → از آمار عملیاتی خارج
 *
 * «معطل‌مانده» (stale): سفارشی که در انتظار است و بیش از N روز از ثبتش
 * گذشته. این‌ها کسانی هستند که مشتری‌شان دارد منتظر می‌ماند.
 */
const { pool } = require('../../db/client');
const { parsePagination, toPagination } = require('../../utils/pagination');

const PENDING_STATUSES = ['pending', 'confirmed', 'processing'];
const SHIPPED_STATUSES = ['shipped', 'delivered'];

// بعد از چند روز یک سفارشِ ارسال‌نشده «معطل» حساب شود
const STALE_DAYS = 3;

/**
 * summary — کارت‌های خلاصه بالای صفحه.
 * همه‌ی شمارش‌ها در یک رفت‌وبرگشت به DB (FILTER به‌جای چند کوئری).
 */
async function summary() {
  const { rows } = await pool.query(
    `SELECT
       count(*) FILTER (WHERE status = ANY($1))::int                        AS shipped_total,
       count(*) FILTER (WHERE status = 'shipped')::int                      AS in_transit,
       count(*) FILTER (WHERE status = 'delivered')::int                    AS delivered,
       count(*) FILTER (WHERE status = ANY($2))::int                        AS pending_total,
       count(*) FILTER (WHERE status = 'pending')::int                      AS new_orders,
       count(*) FILTER (WHERE status = 'confirmed')::int                    AS confirmed,
       count(*) FILTER (WHERE status = 'processing')::int                   AS processing,
       count(*) FILTER (WHERE status = 'cancelled')::int                    AS cancelled,
       count(*) FILTER (
         WHERE status = ANY($2) AND created_at < now() - ($3 || ' days')::interval
       )::int                                                               AS stale,
       count(*) FILTER (
         WHERE status = ANY($2) AND payment_status = 'paid'
       )::int                                                               AS paid_awaiting,
       COALESCE(sum(total_amount) FILTER (WHERE status = ANY($2)), 0)::bigint AS pending_value,
       count(*)::int                                                        AS all_orders
     FROM orders`,
    [SHIPPED_STATUSES, PENDING_STATUSES, String(STALE_DAYS)]
  );

  const r = rows[0];
  const operational = r.pending_total + r.shipped_total; // بدون لغوشده‌ها

  return {
    shipped: {
      total: r.shipped_total,
      inTransit: r.in_transit, // ارسال شده، هنوز تحویل نشده
      delivered: r.delivered,
    },
    pending: {
      total: r.pending_total,
      newOrders: r.new_orders, // تازه ثبت شده، هنوز تأیید نشده
      confirmed: r.confirmed,
      processing: r.processing,
      stale: r.stale, // بیش از STALE_DAYS روز معطل مانده
      paidAwaiting: r.paid_awaiting, // پول گرفته‌ایم ولی نفرستاده‌ایم
      value: Number(r.pending_value),
    },
    cancelled: r.cancelled,
    allOrders: r.all_orders,
    // درصد انجام‌شده از سفارش‌های عملیاتی (لغوشده‌ها کنار گذاشته می‌شوند)
    fulfillmentRate: operational ? Math.round((r.shipped_total / operational) * 100) : 0,
    staleDays: STALE_DAYS,
  };
}

/**
 * list — سفارش‌ها با فیلتر گروهی.
 * @param query.group  'pending' | 'shipped' | 'stale' | 'all'
 */
async function list(query = {}) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });

  const group = ['pending', 'shipped', 'stale', 'all'].includes(query.group) ? query.group : 'pending';

  const params = [];
  let where = '';
  // معطل‌مانده‌ها اول بیایند، بعد قدیمی‌ترین‌ها — یعنی فوری‌ترین کار بالای لیست
  let orderBy = 'o.created_at ASC';

  if (group === 'pending') {
    params.push(PENDING_STATUSES);
    where = `WHERE o.status = ANY($${params.length})`;
  } else if (group === 'shipped') {
    params.push(SHIPPED_STATUSES);
    where = `WHERE o.status = ANY($${params.length})`;
    orderBy = 'o.updated_at DESC'; // تازه‌ترین ارسال‌ها اول
  } else if (group === 'stale') {
    params.push(PENDING_STATUSES);
    params.push(String(STALE_DAYS));
    where = `WHERE o.status = ANY($${params.length - 1})
               AND o.created_at < now() - ($${params.length} || ' days')::interval`;
  }

  const [result, countRows] = await Promise.all([
    pool.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount,
              o.customer_name, o.customer_phone, o.city, o.created_at, o.updated_at,
              (SELECT count(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
              (SELECT COALESCE(sum(oi.quantity), 0)::int FROM order_items oi WHERE oi.order_id = o.id) AS units,
              EXTRACT(DAY FROM now() - o.created_at)::int AS age_days,
              (SELECT h.created_at FROM order_status_history h
                WHERE h.order_id = o.id AND h.to_status = 'shipped'
                ORDER BY h.created_at DESC LIMIT 1) AS shipped_at
         FROM orders o
         ${where}
        ORDER BY ${orderBy}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT count(*)::int AS n FROM orders o ${where}`, params),
  ]);

  return {
    group,
    staleDays: STALE_DAYS,
    items: result.rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      paymentStatus: r.payment_status,
      totalAmount: r.total_amount,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      city: r.city,
      itemsCount: r.items_count,
      units: r.units,
      ageDays: r.age_days,
      isStale: PENDING_STATUSES.includes(r.status) && r.age_days >= STALE_DAYS,
      shippedAt: r.shipped_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    pagination: toPagination(page, limit, countRows.rows[0].n),
  };
}

module.exports = { summary, list, PENDING_STATUSES, SHIPPED_STATUSES, STALE_DAYS };

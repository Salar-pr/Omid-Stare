'use strict';
/**
 * dashboard.service — آمار واقعی از DB (هیچ عدد fake‌ای)
 */
const { pool, checkConnection } = require('../../db/client');

async function stats() {
  const [
    users, products, orders, revenue, coupons, messages, lowStock, dbStatus,
  ] = await Promise.all([
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE is_active AND created_at > now() - interval '30 days')::int AS new30d
         FROM users`
    ),
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE is_active)::int AS active,
              count(*) FILTER (WHERE stock = 0)::int AS out_of_stock
         FROM products`
    ),
    pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'pending')::int AS pending,
              count(*) FILTER (WHERE payment_status = 'paid')::int AS paid,
              count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS last7d
         FROM orders`
    ),
    pool.query(
      `SELECT COALESCE(sum(total_amount) FILTER (WHERE payment_status = 'paid'), 0)::bigint AS total,
              COALESCE(sum(total_amount) FILTER (WHERE payment_status = 'paid' AND created_at > now() - interval '30 days'), 0)::bigint AS last30d
         FROM orders`
    ),
    pool.query(
      `SELECT
         (SELECT count(*)::int FROM coupon_campaigns WHERE is_active AND expires_at > now()) AS active_campaigns,
         (SELECT count(*)::int FROM coupons c WHERE c.assigned_user_id IS NULL AND c.is_active AND c.redeemed_at IS NULL AND c.expires_at > now()) AS unclaimed,
         (SELECT count(*)::int FROM coupons c WHERE c.assigned_user_id IS NOT NULL AND c.redeemed_at IS NULL AND c.is_active AND c.expires_at > now()) AS claimed_unused
       `
    ),
    pool.query(
      `SELECT count(*)::int AS unread FROM contact_messages WHERE status = 'unread'`
    ),
    pool.query(
      `SELECT p.id, p.name, p.slug, p.stock
         FROM products p
        WHERE p.is_active AND p.stock BETWEEN 1 AND 5
        ORDER BY p.stock ASC
        LIMIT 8`
    ),
    checkConnection().catch(() => ({ up: false, latencyMs: null })),
  ]);

  return {
    users: { total: users.rows[0].total, new30d: users.rows[0].new30d },
    products: {
      total: products.rows[0].total,
      active: products.rows[0].active,
      outOfStock: products.rows[0].out_of_stock,
    },
    lowStock: lowStock.rows,
    orders: {
      total: orders.rows[0].total,
      pending: orders.rows[0].pending,
      paid: orders.rows[0].paid,
      last7d: orders.rows[0].last7d,
    },
    revenue: { total: Number(revenue.rows[0].total), last30d: Number(revenue.rows[0].last30d) },
    coupons: coupons.rows[0],
    messages: { unread: messages.rows[0].unread },
    health: { db: dbStatus.up ? 'up' : 'down', dbLatencyMs: dbStatus.latencyMs },
  };
}

module.exports = { stats };

'use strict';
/**
 * reviews.service — فقط خریدار می‌تواند نظر بدهد؛ admin moderate می‌کند.
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { z } = require('zod');

const createSchema = z.object({
  rating: z.coerce.number().int().min(1, 'حداقل ۱ ستاره').max(5, 'حداکثر ۵ ستاره'),
  body: z.string().trim().min(5, 'نظرت خیلی کوتاهە').max(1500, 'نظرت خیلی بلندە'),
});

async function listApproved(productId, query) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.body, r.created_at, u.name, u.avatar_url
       FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.product_id = $1 AND r.is_approved = TRUE
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
    [productId, limit, (page - 1) * limit]
  );
  const { rows: countRows } = await pool.query(
    'SELECT count(*)::int AS n FROM reviews WHERE product_id = $1 AND is_approved = TRUE',
    [productId]
  );
  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      user: r.name,
      avatarUrl: r.avatar_url,
      createdAt: r.created_at,
    })),
    pagination: { page, limit, total: countRows[0].n, totalPages: Math.max(1, Math.ceil(countRows[0].n / limit)) },
  };
}

async function canReview(userId, productId) {
  const { rows } = await pool.query(
    `SELECT 1 FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = $1 AND oi.product_id = $2 AND o.status <> 'cancelled'
      LIMIT 1`,
    [userId, productId]
  );
  return rows.length > 0;
}

async function create(userId, userName, productId, input) {
  const data = createSchema.parse(input);
  if (!(await canReview(userId, productId))) {
    throw new BusinessRuleError('فقط اگه این محصول رو خریده باشی می‌تونی نظر بدهی.', 'NOT_PURCHASED', 400);
  }
  const { rows } = await pool.query(
    `INSERT INTO reviews (user_id, product_id, rating, body)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, product_id) DO NOTHING
     RETURNING id`,
    [userId, productId, data.rating, data.body]
  );
  if (!rows.length) {
    throw new BusinessRuleError('قبل از این نظر خودت رو ثبت کردی.', 'ALREADY_REVIEWED', 400);
  }
  return { id: rows[0].id, approved: false };
}

async function listAllAdmin(query) {
  const status = query.status === 'approved' ? 'approved' : query.status === 'pending' ? 'pending' : null;
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const where = status === 'approved' ? 'is_approved = TRUE' : status === 'pending' ? 'is_approved = FALSE' : 'TRUE';
  const { rows } = await pool.query(
    `SELECT r.id, r.rating, r.body, r.is_approved, r.created_at, u.name AS user_name, u.email AS user_email,
            p.name AS product_name, p.slug
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
      WHERE ${where}
      ORDER BY r.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const { rows: countRows } = await pool.query(`SELECT count(*)::int AS n FROM reviews WHERE ${where}`);
  return {
    items: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      body: r.body,
      isApproved: r.is_approved,
      user: r.user_name,
      userEmail: r.user_email,
      product: r.product_name,
      productSlug: r.slug,
      createdAt: r.created_at,
    })),
    pagination: { page, limit, total: countRows[0].n, totalPages: Math.max(1, Math.ceil(countRows[0].n / limit)) },
  };
}

async function moderate(id, isApproved, admin) {
  const { rowCount } = await pool.query(
    'UPDATE reviews SET is_approved = $1, updated_at = now() WHERE id = $2',
    [isApproved, id]
  );
  if (!rowCount) throw new NotFoundError('نظر پیدا نشد.');
  return true;
}

module.exports = { listApproved, canReview, create, listAllAdmin, moderate };

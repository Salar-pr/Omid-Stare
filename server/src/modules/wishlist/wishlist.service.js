'use strict';
/**
 * wishlist.service — user_wishlist با unique(user, product)
 */
const { pool } = require('../../db/client');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const { z } = require('zod');

const idSchema = z.string().uuid('شناسه معتبر نیست.');

async function list(userId) {
  const { rows } = await pool.query(
    `SELECT p.id, p.slug, p.name, p.image, p.price, p.compare_at_price, p.stock, p.badge,
            (SELECT COALESCE(avg(r.rating),0) FROM reviews r WHERE r.product_id = p.id AND r.is_approved) AS rating,
            (SELECT count(*)::int FROM reviews r WHERE r.product_id = p.id AND r.is_approved) AS reviews_count,
            w.created_at
       FROM user_wishlist w
       JOIN products p ON p.id = w.product_id
      WHERE w.user_id = $1
      ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    image: r.image,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    stock: r.stock,
    badge: r.badge,
    rating: Math.round(Number(r.rating) * 10) / 10,
    reviewsCount: r.reviews_count,
    addedAt: r.created_at,
  }));
}

async function add(userId, productId) {
  idSchema.parse(productId);
  const { rows: pRows } = await pool.query(
    'SELECT id, name FROM products WHERE id = $1 AND is_active = TRUE',
    [productId]
  );
  if (!pRows.length) throw new NotFoundError('محصول پیدا نشد.');

  const { rowCount } = await pool.query(
    `INSERT INTO user_wishlist (user_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id, product_id) DO NOTHING`,
    [userId, productId]
  );
  return { existed: rowCount === 0, product: pRows[0] };
}

async function remove(userId, productId) {
  idSchema.parse(productId);
  const { rowCount } = await pool.query(
    'DELETE FROM user_wishlist WHERE user_id = $1 AND product_id = $2',
    [userId, productId]
  );
  if (!rowCount) throw new NotFoundError('این محصول تو ویش‌لیستت نیست.');
  return true;
}

async function clear(userId) {
  await pool.query('DELETE FROM user_wishlist WHERE user_id = $1', [userId]);
  return true;
}

module.exports = { list, add, remove, clear };

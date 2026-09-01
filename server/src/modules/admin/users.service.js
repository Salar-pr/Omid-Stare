'use strict';
/**
 * admin/users.service — لیست/نقش/فعال‌سازی
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const { z } = require('zod');
const { parsePagination, toPagination } = require('../../utils/pagination');

async function list(query, me) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 15, maxLimit: 50 });
  const params = [];
  let where = '';
  if (query.search) {
    params.push(`%${query.search}%`);
    where = `WHERE (name ILIKE $1 OR email ILIKE $1)`;
  }
  const [result, countRows] = await Promise.all([
    pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, u.last_login_at,
              (SELECT count(*)::int FROM orders o WHERE o.user_id = u.id) AS orders_count,
              u.avatar_url
         FROM users u ${where}
        ORDER BY u.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT count(*)::int AS n FROM users u ${where}`, params),
  ]);
  return {
    items: result.rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      role: r.role,
      isActive: r.is_active,
      avatarUrl: r.avatar_url,
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at,
      ordersCount: r.orders_count,
    })),
    pagination: toPagination(page, limit, countRows.rows[0].n),
  };
}

const updateSchema = z.object({
  role: z.enum(['customer', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

async function update(me, id, input) {
  const data = updateSchema.parse(input);
  if (id === me.id && (data.role === 'customer' || data.isActive === false)) {
    throw new ForbiddenError('نمی‌توانی نقش/فعالیت خودت را تغییر بدهی!');
  }
  const sets = [];
  const params = [];
  if (data.role !== undefined) {
    params.push(data.role);
    sets.push(`role = $${params.length}`);
  }
  if (data.isActive !== undefined) {
    params.push(data.isActive);
    sets.push(`is_active = $${params.length}`);
  }
  if (!sets.length) throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  params.push(id);
  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}
     RETURNING id, name, email, role, is_active, created_at, last_login_at`,
    params
  );
  if (!rows.length) throw new NotFoundError('کاربر پیدا نشد.');
  return rows[0];
}

module.exports = { list, update };

'use strict';
/**
 * contact.service — فرم تماس واقعی (ذخیره + admin management)
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const { z } = require('zod');
const notification = require('../../services/notification.service');

const createSchema = z.object({
  name: z.string().trim().min(2, 'اسمت رو بنویس! 🤘').max(120),
  email: z.string().trim().toLowerCase().email('این ایمیل معتبر نیست').max(190),
  message: z.string().trim().min(5, 'پیام خالی که نمی‌شه فرستاد!').max(2000),
});

async function create(input) {
  const data = createSchema.parse(input);
  const { rows } = await pool.query(
    `INSERT INTO contact_messages (name, email, message)
     VALUES ($1, $2, $3)
     RETURNING id, created_at`,
    [data.name, data.email, data.message]
  );
  await notification.emit('contact_message', {
    id: rows[0].id,
    name: data.name,
    email: data.email,
    preview: data.message.slice(0, 120),
  });
  return rows[0];
}

async function list(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const status = ['unread', 'read', 'archived'].includes(query.status) ? query.status : null;
  const where = status ? 'WHERE status = $1' : '';
  const params = status ? [status] : [];
  params.push(limit, (page - 1) * limit);
  const { rows } = await pool.query(
    `SELECT id, name, email, message, status, created_at
       FROM contact_messages ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const { rows: countRows } = await pool.query(
    `SELECT count(*)::int AS n FROM contact_messages ${status ? 'WHERE status = $1' : ''}`,
    status ? [status] : []
  );
  return { items: rows, pagination: { page, limit, total: countRows[0].n, totalPages: Math.max(1, Math.ceil(countRows[0].n / limit)) } };
}

async function setStatus(id, status) {
  if (!['unread', 'read', 'archived'].includes(status)) {
    throw new ValidationError('وضعیت معتبر نیست.');
  }
  const { rowCount } = await pool.query('UPDATE contact_messages SET status = $1 WHERE id = $2', [status, id]);
  if (!rowCount) throw new NotFoundError('پیام پیدا نشد.');
  return true;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM contact_messages WHERE id = $1', [id]);
  if (!rowCount) throw new NotFoundError('پیام پیدا نشد.');
  return true;
}

module.exports = { create, list, setStatus, remove };

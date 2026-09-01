'use strict';
/**
 * questions.service — Q&A محصول. مهمان هم می‌تواند بپرسد (با نام).
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError } = require('../../utils/errors');
const { z } = require('zod');

const createSchema = z.object({
  question: z.string().trim().min(5, 'سوالت خیلی کوتاهە').max(500, 'سوال خیلی بلندە'),
  authorName: z.string().trim().min(2, 'اسمت رو بنویس').max(80).optional(),
});

async function listPublished(productId) {
  const { rows } = await pool.query(
    `SELECT id, question, answer, author_name, created_at
       FROM product_questions
      WHERE product_id = $1 AND is_published = TRUE
      ORDER BY created_at DESC
      LIMIT 50`,
    [productId]
  );
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    author: r.author_name,
    createdAt: r.created_at,
  }));
}

async function create(userId, userName, productId, input) {
  const data = createSchema.parse(input);
  const author = (userName && userId ? userName : data.authorName) || 'راک‌استار';
  const { rows } = await pool.query(
    `INSERT INTO product_questions (product_id, user_id, author_name, question)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [productId, userId || null, author, data.question]
  );
  return { id: rows[0].id };
}

async function listAllAdmin(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || '30', 10) || 30));
  const { rows } = await pool.query(
    `SELECT q.id, q.question, q.answer, q.author_name, q.is_published, q.created_at,
            p.name AS product_name
       FROM product_questions q
       JOIN products p ON p.id = q.product_id
      ORDER BY q.created_at DESC
      LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  const { rows: countRows } = await pool.query('SELECT count(*)::int AS n FROM product_questions');
  return {
    items: rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      author: r.author_name,
      isPublished: r.is_published,
      product: r.product_name,
      createdAt: r.created_at,
    })),
    pagination: { page, limit, total: countRows[0].n, totalPages: Math.max(1, Math.ceil(countRows[0].n / limit)) },
  };
}

async function answer(id, answer, isPublished) {
  const { rowCount } = await pool.query(
    'UPDATE product_questions SET answer = $1, is_published = $2 WHERE id = $3',
    [answer, isPublished !== false, id]
  );
  if (!rowCount) throw new NotFoundError('سوال پیدا نشد.');
  return true;
}

module.exports = { listPublished, create, listAllAdmin, answer };

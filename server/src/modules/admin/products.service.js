'use strict';
/**
 * admin/products.service — CRUD محصول (نسخه مدیریتی؛ لیست شامل غیرفعال‌ها)
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { z } = require('zod');
const { parsePagination, toPagination } = require('../../utils/pagination');

const productSchema = z.object({
  name: z.string().trim().min(2, 'نام محصول رو بنویس').max(160),
  nameEn: z.string().trim().max(160).optional().default(''),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/, 'slug فقط حرف/عدد/ترز (لاتین) بده').optional(),
  description: z.string().trim().max(4000).optional().default(''),
  price: z.coerce.number().int().min(0, 'قیمت نمی‌تواند منفی باشد'),
  compareAtPrice: z.coerce.number().int().min(0).nullable().optional(),
  stock: z.coerce.number().int().min(0, 'موجودی نمی‌تواند منفی باشد'),
  category: z.string().trim().min(1).max(60).optional().default('عمومی'),
  badge: z.string().trim().max(60).nullable().optional(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10000).optional().default(0),
  image: z.string().trim().max(400).optional().default(''),
  sizes: z.array(z.string().trim().min(1).max(20)).max(20).optional().default([]),
  colors: z.array(z.object({ name: z.string().trim().min(1).max(30), hex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/, 'hex معتبر نیست') })).max(12).optional().default([]),
  gallery: z.array(z.string().trim().min(1).max(400)).max(12).optional().default([]),
  specs: z.array(z.tuple([z.string().trim().min(1).max(80), z.string().trim().min(1).max(200)])).max(20).optional().default([]),
  features: z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]),
});

async function list(query) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 15, maxLimit: 50 });
  const conds = [];
  const params = [];
  if (query.search) {
    params.push(`%${query.search}%`);
    conds.push(`(name ILIKE $${params.length} OR name_en ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }
  if (query.category) {
    params.push(query.category);
    conds.push(`category = $${params.length}`);
  }
  if (query.active === '1') conds.push('is_active = TRUE');
  if (query.active === '0') conds.push('is_active = FALSE');

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [result, countRows] = await Promise.all([
    pool.query(
      `SELECT id, slug, name, name_en, price, compare_at_price, stock, category, badge, is_active, sort_order, image, created_at
         FROM products ${where}
        ORDER BY sort_order, created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT count(*)::int AS n FROM products ${where}`, params),
  ]);
  return {
    items: result.rows.map(mapRow),
    pagination: toPagination(page, limit, countRows.rows[0].n),
  };
}

function mapRow(r) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameEn: r.name_en,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    stock: r.stock,
    category: r.category,
    badge: r.badge,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    image: r.image,
    createdAt: r.created_at,
  };
}

async function get(id) {
  const { rows } = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
  if (!rows.length) throw new NotFoundError('محصول پیدا نشد.');
  const r = rows[0];
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    nameEn: r.name_en,
    description: r.description,
    price: r.price,
    compareAtPrice: r.compare_at_price,
    stock: r.stock,
    category: r.category,
    badge: r.badge,
    isActive: r.is_active,
    sortOrder: r.sort_order,
    image: r.image,
    sizes: r.sizes,
    colors: r.colors,
    gallery: r.gallery,
    specs: r.specs,
    features: r.features,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function create(input) {
  const data = productSchema.parse(input);
  let slug = data.slug;
  if (!slug) {
    slug = await deriveSlug(data.nameEn || data.name);
  }
  const { rows: dup } = await pool.query('SELECT id FROM products WHERE slug = $1', [slug]);
  if (dup.length) throw new ValidationError('این slug تکراری است.');

  const { rows } = await pool.query(
    `INSERT INTO products
       (slug, name, name_en, description, price, compare_at_price, stock, category, badge,
        is_active, sort_order, image, sizes, colors, gallery, specs, features)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb,$17::jsonb)
     RETURNING id`,
    [
      slug, data.name, data.nameEn, data.description, data.price, data.compareAtPrice ?? null,
      data.stock, data.category, data.badge ?? null, data.isActive, data.sortOrder, data.image,
      JSON.stringify(data.sizes), JSON.stringify(data.colors), JSON.stringify(data.gallery || [data.image].filter(Boolean)),
      JSON.stringify(data.specs), JSON.stringify(data.features),
    ]
  );
  return get(rows[0].id);
}

async function update(id, input) {
  const data = productSchema.partial().parse(input);
  const sets = [];
  const params = [];
  const colMap = {
    name: 'name', nameEn: 'name_en', description: 'description', price: 'price',
    compareAtPrice: 'compare_at_price', stock: 'stock', category: 'category',
    badge: 'badge', isActive: 'is_active', sortOrder: 'sort_order', image: 'image',
  };
  for (const [k, col] of Object.entries(colMap)) {
    if (data[k] !== undefined) {
      params.push(data[k]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  const jsonMap = { sizes: 'sizes', colors: 'colors', gallery: 'gallery', specs: 'specs', features: 'features' };
  for (const [k, col] of Object.entries(jsonMap)) {
    if (data[k] !== undefined) {
      params.push(JSON.stringify(data[k]));
      sets.push(`${col} = $${params.length}::jsonb`);
    }
  }
  if (data.slug !== undefined) {
    params.push(data.slug);
    sets.push(`slug = $${params.length}`);
  }
  if (!sets.length) throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  params.push(id);
  const { rowCount } = await pool.query(
    `UPDATE products SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`,
    params
  );
  if (!rowCount) throw new NotFoundError('محصول پیدا نشد.');
  return get(id);
}

/** حذف = archive (is_active=false). hard فقط اگر سفارشی نداشته باشد. */
async function remove(id, hard) {
  if (hard === true) {
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM order_items WHERE product_id = $1', [id]);
    if (rows[0].n > 0) {
      throw new BusinessRuleError('این محصول سفارش دارد — فقط غیرفعالش کن.', 'PRODUCT_HAS_ORDERS', 400);
    }
    const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    if (!rowCount) throw new NotFoundError('محصول پیدا نشد.');
    return { deleted: true };
  }
  const { rowCount } = await pool.query(
    'UPDATE products SET is_active = FALSE, updated_at = now() WHERE id = $1',
    [id]
  );
  if (!rowCount) throw new NotFoundError('محصول پیدا نشد.');
  return { deleted: false, archived: true };
}

async function deriveSlug(input) {
  let s = String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  if (!s) s = 'product-' + Math.random().toString(36).slice(2, 8);
  const baseName = s;
  for (let i = 0; i < 5; i++) {
    const { rows } = await pool.query('SELECT id FROM products WHERE slug = $1', [s]);
    if (!rows.length) return s;
    s = `${baseName}-${Date.now().toString(36)}`.slice(0, 70);
  }
  return s;
}

module.exports = { list, get, create, update, remove };

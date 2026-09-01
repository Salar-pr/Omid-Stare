'use strict';
/**
 * products.service — لیست (server-side search/filter/sort + pagination)،
 * جزئیات (id یا slug)، related. Rating از روی approved reviews محاسبه می‌شود.
 * قیمت/موجودی همیشه از DB — کلاینت هیچ عددی فرستادن نمی‌تواند.
 */
const { db } = require('../../db/client');
const { products, reviews } = require('../../db/schema');
const { and, eq, ilike, gte, lte, desc, asc, inArray, isNotNull, sql, or } = require('drizzle-orm');
const { parsePagination, toPagination } = require('../../utils/pagination');
const { NotFoundError } = require('../../utils/errors');

const SORTS = {
  featured: (p) => [sql`COALESCE(${p.sortOrder}, 0) ASC`, sql`${p.id} ASC`],
  'price-asc': (p) => [sql`${p.price} ASC`],
  'price-desc': (p) => [sql`${p.price} DESC`],
  rating: (p) => [sql`${p.id} ASC`], // ordering نهایی با rating aggregate در JS
  newest: (p) => [sql`${p.createdAt} DESC`],
};

function toApi(p) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    nameEn: p.nameEn,
    description: p.description,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    category: p.category,
    badge: p.badge,
    sortOrder: p.sortOrder,
    image: p.image,
    sizes: p.sizes,
    colors: p.colors,
    gallery: p.gallery,
    specs: p.specs,
    features: p.features,
    createdAt: p.createdAt,
  };
}

async function ratingMap(productIds) {
  if (!productIds.length) return new Map();
  const rows = await db
    .select({
      productId: reviews.productId,
      rating: sql`avg(${reviews.rating})`,
      count: sql`count(*)`,
    })
    .from(reviews)
    .where(and(inArray(reviews.productId, productIds), eq(reviews.isApproved, true)))
    .groupBy(reviews.productId);
  const map = new Map();
  for (const r of rows) {
    map.set(r.productId, { rating: Math.round(Number(r.rating) * 10) / 10, reviewsCount: Number(r.count) });
  }
  return map;
}

/**
 * query params: search, categories (csv), minPrice, maxPrice, sizes (csv),
 * colors (csv), inStock (0/1), slugs (csv), sort, page, limit
 */
async function list(query) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 20, maxLimit: 60 });

  const conds = [eq(products.isActive, true)];

  if (query.search) {
    const q = `%${String(query.search).trim()}%`;
    conds.push(or(ilike(products.name, q), ilike(products.nameEn, q), ilike(products.description, q)));
  }
  if (query.categories) {
    const cats = String(query.categories).split(',').map((s) => s.trim()).filter(Boolean);
    if (cats.length) conds.push(inArray(products.category, cats));
  }
  if (query.minPrice !== undefined && query.minPrice !== '') {
    const n = parseInt(query.minPrice, 10);
    if (Number.isFinite(n)) conds.push(gte(products.price, n));
  }
  if (query.maxPrice !== undefined && query.maxPrice !== '') {
    const n = parseInt(query.maxPrice, 10);
    if (Number.isFinite(n)) conds.push(lte(products.price, n));
  }
  if (query.inStock === '1' || query.inStock === 'true') {
    conds.push(gte(products.stock, 1));
  }
  if (query.slugs) {
    const slugs = String(query.slugs).split(',').map((s) => s.trim()).filter(Boolean);
    if (slugs.length) conds.push(inArray(products.slug, slugs));
  }

  // فیلتر variant با JSONB contains (فقط attributes نمایشی، نه relation)
  if (query.sizes) {
    const sizes = String(query.sizes).split(',').map((s) => s.trim()).filter(Boolean);
    if (sizes.length) {
      for (const s of sizes) conds.push(sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${products.sizes}) AS sz(v) WHERE sz.v = ${s})`);
    }
  }
  if (query.colors) {
    const colors = String(query.colors).split(',').map((s) => s.trim()).filter(Boolean);
    if (colors.length) {
      for (const c of colors) conds.push(sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(${products.colors}) AS col(v) WHERE col.v LIKE ${`%${c}%`})`);
    }
  }

  const where = and(...conds);

  const [rows, countRows] = await Promise.all([
    db
      .select()
      .from(products)
      .where(where)
      .orderBy(...(SORTS[query.sort] ? SORTS[query.sort](products) : SORTS.featured(products)))
      .limit(limit)
      .offset(offset),
    db
      .select({ n: sql`count(*)` })
      .from(products)
      .where(where),
  ]);

  const ids = rows.map((r) => r.id);
  const ratings = await ratingMap(ids);

  let items = rows.map((r) => {
    const agg = ratings.get(r.id) || { rating: 0, reviewsCount: 0 };
    return { ...toApi(r), rating: agg.rating, reviewsCount: agg.reviewsCount };
  });

  if (query.sort === 'rating') {
    items.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
  }

  return {
    items,
    pagination: toPagination(page, limit, Number(countRows[0].n)),
  };
}

async function byIdOrSlug(idOrSlug) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const rows = await db
    .select()
    .from(products)
    .where(isUuid ? eq(products.id, idOrSlug) : eq(products.slug, idOrSlug))
    .limit(1);

  const p = rows[0];
  if (!p) throw new NotFoundError('محصول پیدا نشد.');
  if (!p.isActive && !isUuid) throw new NotFoundError('محصول پیدا نشد.');

  const ratings = await ratingMap([p.id]);
  const agg = ratings.get(p.id) || { rating: 0, reviewsCount: 0 };

  const related = await db
    .select({ id: products.id, name: products.name, price: products.price, image: products.image, slug: products.slug })
    .from(products)
    .where(and(eq(products.isActive, true), sql`${products.id} <> ${p.id}`))
    .orderBy(sql`${products.sortOrder} ASC`)
    .limit(3);

  return {
    ...toApi(p),
    rating: agg.rating,
    reviewsCount: agg.reviewsCount,
    isActive: p.isActive,
    related,
  };
}

module.exports = { list, byIdOrSlug, toApi };

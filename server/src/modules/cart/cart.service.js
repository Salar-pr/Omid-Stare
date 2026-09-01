'use strict';
/**
 * cart.service — server-side cart.
 * قیمت/موجودی همیشه از products خوانده می‌شود؛ کلاینت فقط productId/quantity/variant می‌فرستد.
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, BusinessRuleError, ConflictError } = require('../../utils/errors');
const { z } = require('zod');

const addItemSchema = z.object({
  productId: z.string().uuid('شناسه محصول معتبر نیست.'),
  quantity: z.coerce.number().int().min(1, 'حداقل ۱ عدد').max(99),
  selectedSize: z.string().trim().max(40).optional().nullable(),
  selectedColor: z.string().trim().max(40).optional().nullable(),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'حداقل ۱ عدد').max(99).optional(),
  selectedSize: z.string().trim().max(40).optional().nullable(),
  selectedColor: z.string().trim().max(40).optional().nullable(),
});

async function ensureCart(userId) {
  const { rows } = await pool.query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
     RETURNING id`,
    [userId]
  );
  return rows[0].id;
}

/** آیتم‌ها با snapshot محصول (فقط فیلدهای لازم) + وضعیت stock */
async function getCart(userId) {
  const cartId = await ensureCart(userId);
  const { rows } = await pool.query(
    `SELECT ci.id, ci.product_id, ci.quantity, ci.selected_size, ci.selected_color,
            p.name, p.image, p.price, p.stock, p.is_active, p.slug,
            (ci.quantity * p.price) AS line_total,
            CASE
              WHEN NOT p.is_active THEN 'inactive'
              WHEN p.stock = 0 THEN 'out_of_stock'
              WHEN p.stock < ci.quantity THEN 'low_stock'
              ELSE 'ok'
            END AS state
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1
      ORDER BY ci.created_at`,
    [userId]
  );

  const items = rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    slug: r.slug,
    name: r.name,
    image: r.image,
    quantity: r.quantity,
    selectedSize: r.selected_size,
    selectedColor: r.selected_color,
    unitPrice: r.price,
    lineTotal: Number(r.line_total),
    stock: r.stock,
    state: r.state,
  }));

  const valid = items.filter((i) => i.state === 'ok' || i.state === 'low_stock');
  const subtotal = valid.reduce((s, i) => s + i.lineTotal, 0);
  const count = valid.reduce((s, i) => s + i.quantity, 0);

  return { items, subtotal, count };
}

async function addItem(userId, input) {
  const data = addItemSchema.parse(input);

  const { rows: pRows } = await pool.query(
    `SELECT id, name, stock, is_active, sizes, colors FROM products WHERE id = $1`,
    [data.productId]
  );
  const product = pRows[0];
  if (!product || !product.is_active) {
    throw new NotFoundError('محصول پیدا نشد یا غیرفعاله.');
  }

  // normalize variant: اگر product گزینه دارد، variant اجباری است (و باید معتبر)
  let size = data.selectedSize || null;
  let color = data.selectedColor || null;
  if (Array.isArray(product.sizes) && product.sizes.length) {
    if (!size) size = product.sizes[0];
    else if (!product.sizes.includes(size)) {
      throw new ValidationError(`سایز ${size} برای این محصول موجود نیست.`);
    }
  }
  if (Array.isArray(product.colors) && product.colors.length) {
    if (!color) color = product.colors[0].name;
    else {
      const found = product.colors.find((c) => c.name === color);
      if (!found) throw new ValidationError(`رنگ ${color} برای این محصول موجود نیست.`);
      color = found.name;
    }
  }

  if (product.stock < data.quantity) {
    throw new BusinessRuleError(`موجودی کافی نیست — فقط ${product.stock} عدد مانده.`, 'INSUFFICIENT_STOCK', 400);
  }

  const cartId = await ensureCart(userId);

  // upsert روی unique(cart, product, size, color)
  const { rows } = await pool.query(
    `INSERT INTO cart_items (cart_id, product_id, quantity, selected_size, selected_color)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (cart_id, product_id, selected_size, selected_color)
     DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity, 99)
     RETURNING id`,
    [cartId, data.productId, data.quantity, size, color]
  );

  await pool.query('UPDATE carts SET updated_at = now() WHERE id = $1', [cartId]);
  return { itemId: rows[0].id };
}

async function updateItem(userId, itemId, input) {
  const data = updateItemSchema.parse(input);

  const { rows } = await pool.query(
    `SELECT ci.id, ci.product_id, ci.quantity, ci.selected_size, ci.selected_color, p.stock, p.is_active, p.sizes, p.colors
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
      WHERE ci.id = $1 AND c.user_id = $2`,
    [itemId, userId]
  );
  const item = rows[0];
  if (!item) throw new NotFoundError('این آیتم تو سبدت نیست.');
  if (!item.is_active) throw new BusinessRuleError('این محصول دیگه فعال نیست — از سبد حذفش کن.', 'PRODUCT_INACTIVE', 400);

  let quantity = data.quantity !== undefined ? data.quantity : item.quantity;
  let size = data.selectedSize !== undefined ? data.selectedSize : item.selected_size;
  let color = data.selectedColor !== undefined ? data.selectedColor : item.selected_color;

  if (Array.isArray(item.sizes) && item.sizes.length) {
    if (!size) size = item.sizes[0];
    else if (!item.sizes.includes(size)) throw new ValidationError('این سایز برای محصول معتبر نیست.');
  }
  if (Array.isArray(item.colors) && item.colors.length) {
    const found = item.colors.find((c) => c.name === color);
    if (found) color = found.name;
  }

  if (quantity > item.stock) {
    throw new BusinessRuleError(`موجودی کافی نیست — فقط ${item.stock} عدد مانده.`, 'INSUFFICIENT_STOCK', 400);
  }

  await pool.query(
    `UPDATE cart_items SET quantity = $1, selected_size = $2, selected_color = $3 WHERE id = $4`,
    [quantity, size, color, itemId]
  );
  return true;
}

async function removeItem(userId, itemId) {
  const { rowCount } = await pool.query(
    `DELETE FROM cart_items ci USING carts c WHERE ci.id = $1 AND ci.cart_id = c.id AND c.user_id = $2`,
    [itemId, userId]
  );
  if (!rowCount) throw new NotFoundError('این آیتم تو سبدت نیست.');
  return true;
}

async function clearCart(userId) {
  await pool.query(
    `DELETE FROM cart_items ci USING carts c WHERE c.user_id = $1`,
    [userId]
  );
  return true;
}

module.exports = { ensureCart, getCart, addItem, updateItem, removeItem, clearCart };

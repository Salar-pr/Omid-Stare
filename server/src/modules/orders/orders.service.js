'use strict';
/**
 * orders.service — ساخت سفارش داخل transaction کامل:
 *
 *  1. خواندن cart (FOR UPDATE روی cart)
 *  2. خواندن products (FOR UPDATE — قفل ردیف → race دو خریدار روی آخرین عدد)
 *  3. بررسی stock / active
 *  4. قیمت فقط از DB (هیچ مبلغی از کلاینت trust نمی‌شود)
 *  5. validate coupon + discount (coupon ردیف هم FOR UPDATE)
 *  6. order + items (snapshot) + decrement stock + redeem coupon (atomic)
 *  7. history + clear cart
 * هر خطا → ROLLBACK کامل.
 */
const { pool } = require('../../db/client');
const config = require('../../config');
const {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} = require('../../utils/errors');
const { z } = require('zod');
const { jalaliParts } = require('../../utils/jalali');
const notification = require('../../services/notification.service');

const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'اسم گیرنده رو بنویس').max(120),
  customerPhone: z
    .string()
    .trim()
    .regex(/^(\+98|0)?9\d{9}$/, 'شماره موبایل معتبر نیست (09xxxxxxxxx)'),
  customerEmail: z.string().trim().toLowerCase().email('ایمیل معتبر نیست').max(190).optional().nullable(),
  shippingAddress: z.string().trim().min(5, 'آدرس کامل رو بنویس').max(400),
  city: z.string().trim().max(80).optional().nullable(),
  postalCode: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(600).optional().nullable(),
  couponId: z.string().uuid('شناسه کد تخفیف معتبر نیست.').optional().nullable(),
});

/** مبلغ تخفیف روی eligible subtotal (تومان، round) */
function computeDiscount(discountType, discountValue, eligibleSubtotal) {
  if (discountType === 'percentage') {
    const v = Math.min(100, Math.max(0, discountValue));
    return Math.round((eligibleSubtotal * v) / 100);
  }
  return Math.min(discountValue, eligibleSubtotal);
}

async function validateCouponTx(client, userId, couponId, cartItems) {
  const { rows } = await client.query(
    `SELECT c.id, c.code_last4, c.expires_at, c.is_active, c.redeemed_at, c.assigned_user_id,
            cm.discount_type, cm.discount_value, cm.target_product_id, cm.is_active AS campaign_active,
            cm.starts_at, cm.expires_at AS campaign_expires, cm.max_uses, cm.redeemed_count
       FROM coupons c
       JOIN coupon_campaigns cm ON cm.id = c.campaign_id
      WHERE c.id = $1
      FOR UPDATE OF c`,
    [couponId]
  );
  const c = rows[0];
  if (!c) throw new BusinessRuleError('کد تخفیف معتبر نیست.', 'INVALID_COUPON', 400);
  if (c.assigned_user_id !== userId) {
    throw new BusinessRuleError('این کد متعلق به حساب توست؟ به نظر نمی‌رسه.', 'NOT_YOUR_COUPON', 400);
  }
  if (c.redeemed_at) throw new BusinessRuleError('این کد قبلا مصرف شده.', 'COUPON_REDEEMED', 400);
  if (!c.is_active) throw new BusinessRuleError('این کد غیرفعاله.', 'COUPON_INACTIVE', 400);
  if (c.expires_at < new Date()) throw new BusinessRuleError('این کد تمام شده.', 'COUPON_EXPIRED', 400);
  if (!c.campaign_active) throw new BusinessRuleError('کمپین این کد غیرفعاله.', 'CAMPAIGN_INACTIVE', 400);
  if (c.starts_at > new Date()) throw new BusinessRuleError('هنوز نوبت این کد نشده.', 'CAMPAIGN_NOT_STARTED', 400);
  if (c.campaign_expires < new Date()) throw new BusinessRuleError('کمپین این کد تموم شده.', 'CAMPAIGN_EXPIRED', 400);

  // تخفیف روی اقلام واجد شرایط
  let eligibleSubtotal = 0;
  if (c.target_product_id) {
    for (const it of cartItems) {
      if (it.productId === c.target_product_id) eligibleSubtotal += it.unitPrice * it.quantity;
    }
    if (eligibleSubtotal === 0) {
      throw new BusinessRuleError('این کد فقط روی محصول خاص خودش اعمال می‌شه و الان تو سبده نیست.', 'COUPON_TARGET_MISMATCH', 400);
    }
  } else {
    eligibleSubtotal = cartItems.reduce((s, it) => s + it.unitPrice * it.quantity, 0);
  }

  const discountAmount = computeDiscount(c.discount_type, c.discount_value, eligibleSubtotal);
  return { coupon: c, discountAmount };
}

async function createOrder(userId, user, input) {
  const data = createOrderSchema.parse(input);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) cart
    const cartRes = await client.query(
      `SELECT c.id FROM carts c WHERE c.user_id = $1 FOR UPDATE`,
      [userId]
    );
    const cartId = cartRes.rows[0] ? cartRes.rows[0].id : null;
    if (!cartId) throw new BusinessRuleError('سبدت خالیه — اول چیزی به سبد اضافه کن.', 'EMPTY_CART', 400);

    const itemsRes = await client.query(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.selected_size, ci.selected_color,
              p.id AS pid, p.name AS pname, p.price AS pprice, p.stock AS pstock, p.is_active AS pactive
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at
        FOR UPDATE OF p`,
      [cartId]
    );
    if (!itemsRes.rows.length) {
      throw new BusinessRuleError('سبدت خالیه — اول چیزی به سبد اضافه کن.', 'EMPTY_CART', 400);
    }

    // 2-4) stock + active + price از DB
    let subtotal = 0;
    const cartItems = itemsRes.rows.map((r) => {
      if (!r.pactive) {
        throw new BusinessRuleError(`«${r.pname}» دیگه فعال نیست — از سبد حذفش کن.`, 'PRODUCT_INACTIVE', 400);
      }
      if (r.pstock < r.quantity) {
        throw new BusinessRuleError(`موجودی «${r.pname}» کافی نیست (فقط ${r.pstock} عدد مانده).`, 'INSUFFICIENT_STOCK', 400);
      }
      const lineTotal = r.pprice * r.quantity;
      subtotal += lineTotal;
      return {
        productId: r.pid,
        name: r.pname,
        unitPrice: r.pprice,
        quantity: r.quantity,
        selectedSize: r.selected_size,
        selectedColor: r.selected_color,
        stock: r.pstock,
        lineTotal,
      };
    });

    // 5) coupon
    let couponId = null;
    let discountAmount = 0;
    if (data.couponId) {
      const v = await validateCouponTx(client, userId, data.couponId, cartItems);
      couponId = v.coupon.id;
      discountAmount = v.discountAmount;
    }

    // 6) totals
    const shippingAmount = Math.max(0, config.shippingAmount);
    const totalAmount = subtotal - discountAmount + shippingAmount;

    // 7) order number: OR-<jalaliYear>-<6 digits> (atomic sequence, self-healing)
    const seqRes = await client.query(
      `INSERT INTO app_sequences (key, last_value) VALUES ('order_number', 1)
       ON CONFLICT (key) DO UPDATE SET last_value = app_sequences.last_value + 1
       RETURNING last_value`
    );
    const seq = Number(seqRes.rows[0].last_value);
    const { jy } = jalaliParts(new Date());
    const orderNumber = `OR-${jy}-${String(seq).padStart(6, '0')}`;

    const orderRes = await client.query(
      `INSERT INTO orders
         (order_number, user_id, status, payment_status, subtotal, discount_amount,
          shipping_amount, total_amount, coupon_id, customer_name, customer_phone,
          customer_email, shipping_address, city, postal_code, notes)
       VALUES ($1,$2,'pending','unpaid',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id, order_number, created_at`,
      [
        orderNumber, userId, subtotal, discountAmount, shippingAmount, totalAmount,
        couponId, data.customerName, data.customerPhone, data.customerEmail || null,
        data.shippingAddress, data.city || null, data.postalCode || null, data.notes || null,
      ]
    );
    const orderId = orderRes.rows[0].id;

    // 8) items snapshot
    for (const it of cartItems) {
      await client.query(
        `INSERT INTO order_items
           (order_id, product_id, product_name_snapshot, unit_price, quantity, selected_size, selected_color, line_total)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [orderId, it.productId, it.name, it.unitPrice, it.quantity, it.selectedSize, it.selectedColor, it.lineTotal]
      );
    }

    // 9) decrement stock (ردیف‌ها قفل هستند — race-safe)
    for (const it of cartItems) {
      const r = await client.query(
        `UPDATE products SET stock = stock - $1, updated_at = now() WHERE id = $2 AND stock >= $1`,
        [it.quantity, it.productId]
      );
      if (!r.rowCount) {
        throw new BusinessRuleError('موجودی در لحظه ثبت سفارش کافی نبود — دوباره چک کن.', 'INSUFFICIENT_STOCK', 400);
      }
    }

    // 10) redeem coupon — atomic: coupon lock + conditional campaign increment
    if (couponId) {
      const r1 = await client.query(
        `UPDATE coupons
            SET redeemed_at = now(), redeemed_order_id = $1
          WHERE id = $2 AND assigned_user_id = $3 AND redeemed_at IS NULL`,
        [orderId, couponId, userId]
      );
      if (!r1.rowCount) throw new BusinessRuleError('این کد هم‌زمان مصرف شده — سفارش لغو شد.', 'COUPON_REDEEMED', 400);

      const campRes = await client.query(
        `SELECT campaign_id FROM coupons WHERE id = $1`,
        [couponId]
      );
      const campaignId = campRes.rows[0].campaign_id;
      const r2 = await client.query(
        `UPDATE coupon_campaigns
            SET redeemed_count = redeemed_count + 1
          WHERE id = $1 AND (max_uses IS NULL OR redeemed_count < max_uses)`,
        [campaignId]
      );
      if (!r2.rowCount) throw new BusinessRuleError('سقف استفاده این کد پر شده — سفارش لغو شد.', 'CAMPAIGN_LIMIT', 400);
    }

    // 11) history + clear cart
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor_id, actor_name, note)
       VALUES ($1, NULL, 'pending', $2, $3, 'ثبت سفارش توسط مشتری')`,
      [orderId, userId, user.name]
    );
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    await client.query('UPDATE carts SET updated_at = now() WHERE id = $1', [cartId]);

    await client.query('COMMIT');

    // notification خارج از transaction (اگر شکست، سفارش کم نمی‌آورد)
    await notification.emit('order_created', {
      orderNumber,
      userId,
      customer: data.customerName,
      totalAmount,
      itemsCount: cartItems.length,
    });

    const full = await getOrderFull(orderId);
    return full;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getOrderFull(orderId) {
  const { rows } = await pool.query(
    `SELECT o.*, u.name AS customer_user_name, c.code_last4 AS coupon_last4, cm.name AS coupon_name
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN coupons c ON c.id = o.coupon_id
       LEFT JOIN coupon_campaigns cm ON cm.id = c.campaign_id
      WHERE o.id = $1`,
    [orderId]
  );
  if (!rows.length) return null;
  const { rows: items } = await pool.query(
    `SELECT oi.id, oi.product_id, oi.product_name_snapshot, oi.unit_price, oi.quantity,
            oi.selected_size, oi.selected_color, oi.line_total, p.image AS image
       FROM order_items oi
       LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = $1 ORDER BY oi.id`,
    [orderId]
  );
  const { rows: history } = await pool.query(
    `SELECT from_status, to_status, actor_name, note, created_at
       FROM order_status_history WHERE order_id = $1 ORDER BY created_at`,
    [orderId]
  );
  return {
    ...mapOrder(rows[0]),
    items: mapItems(items),
    // مثل بقیه‌ی API به camelCase نگاشت کن — فرانت به fromStatus/toStatus/actor/at خوانده می‌شود
    history: history.map((h) => ({
      fromStatus: h.from_status,
      toStatus: h.to_status,
      actor: h.actor_name,
      note: h.note,
      at: h.created_at,
    })),
  };
}

function mapItems(rows) {
  return rows.map((r) => ({
    id: r.id,
    productId: r.product_id,
    productName: r.product_name_snapshot,
    image: r.image || null,
    unitPrice: r.unit_price,
    quantity: r.quantity,
    selectedSize: r.selected_size,
    selectedColor: r.selected_color,
    lineTotal: r.line_total,
  }));
}

function mapOrder(r) {
  return {
    id: r.id,
    userId: r.user_id,
    orderNumber: r.order_number,
    status: r.status,
    paymentStatus: r.payment_status,
    subtotal: r.subtotal,
    discountAmount: r.discount_amount,
    shippingAmount: r.shipping_amount,
    totalAmount: r.total_amount,
    coupon: r.coupon_last4
      ? { codeLast4: r.coupon_last4, campaignName: r.coupon_name }
      : null,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    shippingAddress: r.shipping_address,
    city: r.city,
    postalCode: r.postal_code,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

async function listMine(userId, query) {
  const { parsePagination, toPagination } = require('../../utils/pagination');
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 10, maxLimit: 50 });
  const [result, countResult] = await Promise.all([
    pool.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_amount, o.subtotal,
              o.discount_amount, o.shipping_amount, o.created_at, c.code_last4 AS coupon_last4
         FROM orders o LEFT JOIN coupons c ON c.id = o.coupon_id
        WHERE o.user_id = $1
        ORDER BY o.created_at DESC
        LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query('SELECT count(*)::int AS n FROM orders WHERE user_id = $1', [userId]),
  ]);
  return {
    items: result.rows.map((r) => ({
      id: r.id,
      orderNumber: r.order_number,
      status: r.status,
      paymentStatus: r.payment_status,
      subtotal: r.subtotal,
      discountAmount: r.discount_amount,
      shippingAmount: r.shipping_amount,
      totalAmount: r.total_amount,
      couponLast4: r.coupon_last4,
      createdAt: r.created_at,
    })),
    pagination: toPagination(page, limit, countResult.rows[0].n),
  };
}

/** پیش‌نمایش تخفیف برای checkout (بدون تغییر state) */
async function quote(userId, query) {
  const { rows: cartRows } = await pool.query(
    `SELECT ci.product_id, ci.quantity, p.price, p.stock, p.is_active, p.name
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = $1`,
    [userId]
  );
  const subtotal = cartRows.filter((r) => r.is_active).reduce((s, r) => s + r.price * r.quantity, 0);
  const result = {
    subtotal,
    discountAmount: 0,
    shippingAmount: config.shippingAmount,
    total: subtotal + config.shippingAmount,
    coupon: null,
  };
  if (query.couponId && cartRows.length) {
    const { rows } = await pool.query(
      `SELECT c.id, c.code_last4, c.expires_at, c.is_active, c.redeemed_at, c.assigned_user_id,
              cm.discount_type, cm.discount_value, cm.target_product_id, cm.is_active AS campaign_active,
              cm.starts_at, cm.expires_at AS campaign_expires
         FROM coupons c JOIN coupon_campaigns cm ON cm.id = c.campaign_id
        WHERE c.id = $1`,
      [query.couponId]
    );
    const c = rows[0];
    const now = new Date();
    const invalid = (msg, code) => {
      const e = new BusinessRuleError(msg, code, 400);
      e.partial = { ...result, coupon: { codeLast4: c ? c.code_last4 : null } };
      throw e;
    };
    if (!c) invalid('کد تخفیف معتبر نیست.', 'INVALID_COUPON');
    if (c.assigned_user_id !== userId) invalid('این کد مال تو نیست.', 'NOT_YOUR_COUPON');
    if (c.redeemed_at) invalid('این کد قبلا مصرف شده.', 'COUPON_REDEEMED');
    if (!c.is_active || !c.campaign_active) invalid('این کد غیرفعاله.', 'COUPON_INACTIVE');
    if (c.expires_at < now || c.campaign_expires < now) invalid('این کد تمام شده.', 'COUPON_EXPIRED');
    if (c.starts_at > now) invalid('هنوز نوبت این کد نشده.', 'CAMPAIGN_NOT_STARTED');

    let eligible = 0;
    for (const r of cartRows) {
      if (!r.is_active) continue;
      if (c.target_product_id ? r.product_id === c.target_product_id : true) {
        eligible += r.price * r.quantity;
      }
    }
    if (c.target_product_id && eligible === 0) {
      invalid('این کد فقط روی محصول خاص خودش اعمال می‌شه و الان تو سبده نیست.', 'COUPON_TARGET_MISMATCH');
    }
    const discount = computeDiscount(c.discount_type, c.discount_value, eligible);
    result.discountAmount = discount;
    result.total = subtotal - discount + config.shippingAmount;
    result.coupon = { id: c.id, codeLast4: c.code_last4, discountAmount: discount };
  }
  return result;
}

module.exports = { createOrder, listMine, getOrderFull, mapOrder, quote };

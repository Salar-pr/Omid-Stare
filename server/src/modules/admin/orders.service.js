'use strict';
/**
 * admin/orders.service — لیست با filter، جزئیات، تغییر status/payment با history (actor+time)
 */
const { pool } = require('../../db/client');
const { ValidationError, NotFoundError, BusinessRuleError } = require('../../utils/errors');
const { z } = require('zod');
const { parsePagination, toPagination } = require('../../utils/pagination');
const notification = require('../../services/notification.service');

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENTS = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

// transition map — تغییرهای معقول فقط (cancelled/delivered ترمینال‌اند)
const TRANSITIONS = {
  pending: ['confirmed', 'processing', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

async function list(query) {
  const { page, limit, offset } = parsePagination(query, { defaultLimit: 15, maxLimit: 50 });
  const conds = [];
  const params = [];
  if (query.status && STATUSES.includes(query.status)) {
    params.push(query.status);
    conds.push(`o.status = $${params.length}`);
  }
  if (query.payment && PAYMENTS.includes(query.payment)) {
    params.push(query.payment);
    conds.push(`o.payment_status = $${params.length}`);
  }
  if (query.search) {
    params.push(`%${query.search}%`);
    conds.push(`(o.order_number ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_phone ILIKE $${params.length})`);
  }
  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const [result, countRows] = await Promise.all([
    pool.query(
      `SELECT o.id, o.order_number, o.status, o.payment_status, o.subtotal, o.discount_amount,
              o.shipping_amount, o.total_amount, o.customer_name, o.customer_phone, o.created_at,
              (SELECT count(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS items_count,
              c.code_last4
         FROM orders o LEFT JOIN coupons c ON c.id = o.coupon_id
         ${where}
        ORDER BY o.created_at DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT count(*)::int AS n FROM orders o ${where}`, params),
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
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      createdAt: r.created_at,
      itemsCount: r.items_count,
      couponLast4: r.code_last4,
    })),
    pagination: toPagination(page, limit, countRows.rows[0].n),
  };
}

async function get(id) {
  const { rows } = await pool.query(
    `SELECT o.*, u.name AS user_name, u.email AS user_email, c.code_last4, cm.name AS coupon_name,
            p.name AS coupon_target
       FROM orders o
       JOIN users u ON u.id = o.user_id
       LEFT JOIN coupons c ON c.id = o.coupon_id
       LEFT JOIN coupon_campaigns cm ON cm.id = c.campaign_id
       LEFT JOIN products p ON p.id = cm.target_product_id
      WHERE o.id = $1`,
    [id]
  );
  if (!rows.length) throw new NotFoundError('سفارش پیدا نشد.');
  const o = rows[0];
  const { rows: items } = await pool.query(
    `SELECT oi.*, img.image FROM order_items oi LEFT JOIN products img ON img.id = oi.product_id WHERE oi.order_id = $1`,
    [id]
  );
  const { rows: history } = await pool.query(
    'SELECT from_status, to_status, actor_name, note, created_at FROM order_status_history WHERE order_id = $1 ORDER BY created_at',
    [id]
  );
  return {
    id: o.id,
    orderNumber: o.order_number,
    status: o.status,
    paymentStatus: o.payment_status,
    subtotal: o.subtotal,
    discountAmount: o.discount_amount,
    shippingAmount: o.shipping_amount,
    totalAmount: o.total_amount,
    coupon: o.code_last4 ? { codeLast4: o.code_last4, campaignName: o.coupon_name, target: o.coupon_target } : null,
    customerName: o.customer_name,
    customerPhone: o.customer_phone,
    customerEmail: o.customer_email,
    shippingAddress: o.shipping_address,
    city: o.city,
    postalCode: o.postal_code,
    notes: o.notes,
    user: { name: o.user_name, email: o.user_email },
    items: items.map((r) => ({
      productId: r.product_id,
      productName: r.product_name_snapshot,
      image: r.image,
      unitPrice: r.unit_price,
      quantity: r.quantity,
      selectedSize: r.selected_size,
      selectedColor: r.selected_color,
      lineTotal: r.line_total,
    })),
    history: history.map((r) => ({
      fromStatus: r.from_status,
      toStatus: r.to_status,
      actor: r.actor_name,
      note: r.note,
      at: r.created_at,
    })),
    createdAt: o.created_at,
    updatedAt: o.updated_at,
  };
}

const statusSchema = z.object({
  status: z.enum(STATUSES),
  paymentStatus: z.enum(PAYMENTS).optional(),
  note: z.string().trim().max(300).optional(),
});

async function updateStatus(admin, id, input) {
  const data = statusSchema.parse(input);
  const { rows } = await pool.query('SELECT status FROM orders WHERE id = $1', [id]);
  if (!rows.length) throw new NotFoundError('سفارش پیدا نشد.');
  const current = rows[0].status;

  if (data.status !== current) {
    if (!TRANSITIONS[current].includes(data.status)) {
      throw new BusinessRuleError(
        `تغییر از «${current}» به «${data.status}» مجاز نیست.`,
        'INVALID_TRANSITION',
        400
      );
    }
  }
  if (data.paymentStatus === undefined && data.status === current) {
    throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sets = [];
    const params = [];
    if (data.status !== current) {
      params.push(data.status);
      sets.push(`status = $${params.length}`);
    }
    if (data.paymentStatus !== undefined) {
      params.push(data.paymentStatus);
      sets.push(`payment_status = $${params.length}`);
    }
    params.push(id);
    await client.query(`UPDATE orders SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params);

    const toStatus = data.status !== current ? data.status : current;
    const note = data.note || (data.status !== current ? `تغییر status به ${toStatus}` : `تغییر payment به ${data.paymentStatus}`);
    await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, actor_id, actor_name, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, current, toStatus, admin.id, admin.name, note]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  await notification.emit('order_updated', {
    orderId: id,
    status: data.status,
    paymentStatus: data.paymentStatus || null,
    by: admin.name,
  });
  return get(id);
}

module.exports = { list, get, updateStatus, STATUSES, PAYMENTS, TRANSITIONS };

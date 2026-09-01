'use strict';
/**
 * coupons.service — CLAIM ≠ REDEEM
 *
 * CLAIM:  کاربر کد را وارد می‌کند → coupon به حسابش attach می‌شود (claimedAt)
 * REDEEM: کاربر هنگام خرید از آن استفاده می‌کند (redeemedAt + order)
 *
 * امنیت:
 * - کد raw هرگز در DB نیست (sha256 hash + last4).
 * - claim atomic: UPDATE ... WHERE assigned_user_id IS NULL (دو request همزمان → یکی می‌بازد)
 * - rate-limit در route + پاسخ generic (فاش نمی‌کند کد وجود دارد یا نه).
 * - brute-force: alphabet کوچک (بدون 0/O/1/I/L) + 16 کاراکتر ≈ 30^16 = 4.3e23.
 */
const crypto = require('node:crypto');
const { pool } = require('../../db/client');
const {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
  ConflictError,
} = require('../../utils/errors');
const { z } = require('zod');
const config = require('../../config');

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 30 حرف، بدون 0/O/1/I/L
const CODE_LENGTH = 16;

function normalizeCode(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function hashCode(raw) {
  return crypto.createHash('sha256').update(normalizeCode(raw)).digest('hex');
}

function generateCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  // گروه‌بندی ۴تایی برای خوانایی (نمایشی؛ normalize جداگانه همه چیز را یکدست می‌کند)
  return code.match(/.{1,4}/g).join('-');
}

const claimSchema = z.object({
  code: z.string().trim().min(4, 'کد خیلی کوتاهه').max(64, 'کد خیلی بلندە'),
});

const campaignSchema = z.object({
  name: z.string().trim().min(3, 'نام کمپین رو بنویس').max(120),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.coerce.number().int().min(1, 'مبلغ/درصد باید مثبت باشه'),
  targetProductId: z.string().uuid().optional().nullable(),
  startsAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date(),
  maxUses: z.coerce.number().int().min(1).optional().nullable(),
  codeCount: z.coerce.number().int().min(1, 'حداقل ۱ کد').max(500, 'حداکثر ۵۰۰ کد در هر بار'),
  isActive: z.boolean().optional().default(true),
}).refine((d) => {
  if (d.discountType === 'percentage' && d.discountValue > 100) return false;
  return true;
}, { message: 'درصد تخفیف نمی‌تواند بیشتر از 100 باشد.' });

// ---------- USER (claim + my list) ----------

async function claim(userId, input) {
  const data = claimSchema.parse(input);
  const hash = hashCode(data.code);

  // هرگز code را در log ننویس؛ فقط last4 اگر پیدا شد
  const { rows } = await pool.query(
    `SELECT c.id, c.code_last4, c.assigned_user_id, c.claimed_at, c.redeemed_at, c.expires_at, c.is_active,
            cm.id AS campaign_id, cm.name, cm.discount_type, cm.discount_value,
            cm.is_active AS campaign_active, cm.starts_at, cm.expires_at AS campaign_expires,
            cm.max_uses, cm.redeemed_count, p.name AS target_product_name
       FROM coupons c
       JOIN coupon_campaigns cm ON cm.id = c.campaign_id
       LEFT JOIN products p ON p.id = cm.target_product_id
      WHERE c.code_hash = $1`,
    [hash]
  );
  const c = rows[0];
  const now = new Date();

  // پیام‌ها عمدا generic-ish: وجود/نبود کد را به‌صورت دقیق فاش نمی‌کنند
  if (!c || !c.is_active || !c.campaign_active || c.expires_at < now || c.campaign_expires < now || c.starts_at > now || c.redeemed_at) {
    if (c) {
      await pool.query(
        `INSERT INTO notifications (type, payload) VALUES ('coupon_abuse_attempt', $1)`,
        [JSON.stringify({ last4: c.code_last4, userId, reason: 'invalid-state' })]
      );
    }
    throw new BusinessRuleError('کد تخفیف معتبر نیست یا دیگر فعال نیست.', 'INVALID_COUPON', 400);
  }
  if (c.max_uses !== null && c.redeemed_count >= c.max_uses) {
    throw new BusinessRuleError('این کد دیگه قابل استفاده نیست.', 'CAMPAIGN_LIMIT', 400);
  }
  if (c.assigned_user_id && c.assigned_user_id !== userId) {
    await pool.query(
      `INSERT INTO notifications (type, payload) VALUES ('coupon_abuse_attempt', $1)`,
      [JSON.stringify({ last4: c.code_last4, userId, reason: 'wrong-user' })]
    );
    throw new BusinessRuleError('این کد قبلا claim شده.', 'COUPON_TAKEN', 409);
  }
  if (c.assigned_user_id === userId) {
    // idempotent: همان کد، همان state
    return couponView(c, 'claimed', true);
  }

  // atomic claim — اگر هم‌زمان دیگری claim کرده باشد rowCount=0
  const r = await pool.query(
    `UPDATE coupons
        SET assigned_user_id = $1, claimed_at = now()
      WHERE id = $2 AND assigned_user_id IS NULL AND is_active = TRUE
        AND expires_at > now() AND redeemed_at IS NULL`,
    [userId, c.id]
  );
  if (!r.rowCount) {
    throw new ConflictError('این کد همین حالا claim شده — دوباره چک کن.', 'COUPON_TAKEN');
  }

  return couponView({ ...c, assigned_user_id: userId, claimed_at: new Date() }, 'claimed');
}

function couponView(c, stateOverride) {
  const now = new Date();
  let state = 'active';
  if (c.redeemed_at) state = 'redeemed';
  else if (c.expires_at < now || c.campaign_expires < now) state = 'expired';
  else if (!c.is_active || !c.campaign_active) state = 'invalid';
  if (stateOverride && c.assigned_user_id && !c.redeemed_at) state = stateOverride;
  return {
    id: c.id,
    campaignName: c.name,
    discountType: c.discount_type,
    discountValue: c.discount_value,
    targetProduct: c.target_product_name || null,
    codeLast4: c.code_last4,
    claimedAt: c.claimed_at || null,
    redeemedAt: c.redeemed_at || null,
    expiresAt: c.expires_at,
    state,
  };
}

async function myCoupons(userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.code_last4, c.claimed_at, c.redeemed_at, c.expires_at, c.is_active,
            cm.name, cm.discount_type, cm.discount_value, cm.is_active AS campaign_active,
            cm.expires_at AS campaign_expires, p.name AS target_product_name
       FROM coupons c
       JOIN coupon_campaigns cm ON cm.id = c.campaign_id
       LEFT JOIN products p ON p.id = cm.target_product_id
      WHERE c.assigned_user_id = $1
      ORDER BY COALESCE(c.redeemed_at, c.expires_at) DESC NULLS LAST, c.claimed_at DESC`,
    [userId]
  );
  return rows.map((r) => ({ ...r, state: null })).map((r) => {
    const now = new Date();
    let state = 'claimed'; // در myCoupons همیشه assigned است
    if (r.redeemed_at) state = 'redeemed';
    else if (r.expires_at < now || r.campaign_expires < now) state = 'expired';
    else if (!r.is_active || !r.campaign_active) state = 'invalid';
    return couponView(
      {
        id: r.id,
        name: r.name,
        discount_type: r.discount_type,
        discount_value: r.discount_value,
        target_product_name: r.target_product_name,
        code_last4: r.code_last4,
        claimed_at: r.claimed_at,
        redeemed_at: r.redeemed_at,
        expires_at: r.expires_at,
        campaign_expires: r.campaign_expires,
        is_active: r.is_active,
        campaign_active: r.campaign_active,
        assigned_user_id: userId,
      },
      state
    );
  });
}

// ---------- ADMIN ----------

async function listCampaigns(query) {
  const { rows: campaigns } = await pool.query(
    `SELECT cm.*, p.name AS target_product_name,
            (SELECT count(*)::int FROM coupons c WHERE c.campaign_id = cm.id) AS code_count,
            (SELECT count(*)::int FROM coupons c WHERE c.campaign_id = cm.id AND c.assigned_user_id IS NOT NULL) AS claimed_count,
            (SELECT count(*)::int FROM coupons c WHERE c.campaign_id = cm.id AND c.redeemed_at IS NOT NULL) AS redeemed_count_codes
       FROM coupon_campaigns cm
       LEFT JOIN products p ON p.id = cm.target_product_id
      ORDER BY cm.created_at DESC`
  );
  return campaigns.map((r) => ({
    id: r.id,
    name: r.name,
    discountType: r.discount_type,
    discountValue: r.discount_value,
    targetProductId: r.target_product_id,
    targetProductName: r.target_product_name,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    maxUses: r.max_uses,
    redeemedCount: r.redeemed_count,
    isActive: r.is_active,
    createdAt: r.created_at,
    codeCount: r.code_count,
    claimedCount: r.claimed_count,
  }));
}

async function createCampaign(input) {
  const data = campaignSchema.parse(input);

  if (data.targetProductId) {
    const { rows } = await pool.query('SELECT id FROM products WHERE id = $1', [data.targetProductId]);
    if (!rows.length) throw new ValidationError('محصول هدف پیدا نشد.');
  }
  if (data.startsAt && data.expiresAt <= data.startsAt) {
    throw new ValidationError('تاریخ پایان باید بعد از شروع باشه.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const campRes = await client.query(
      `INSERT INTO coupon_campaigns
         (name, discount_type, discount_value, target_product_id, starts_at, expires_at, max_uses, is_active)
       VALUES ($1,$2,$3,$4, COALESCE($5, now()), $6, $7, $8)
       RETURNING id`,
      [
        data.name,
        data.discountType,
        data.discountValue,
        data.targetProductId || null,
        data.startsAt || null,
        data.expiresAt,
        data.maxUses || null,
        data.isActive !== false,
      ]
    );
    const campaignId = campRes.rows[0].id;

    const codes = await generateCodesTx(client, campaignId, data.codeCount, data.expiresAt);

    await client.query('COMMIT');
    return {
      campaignId,
      // raw codes فقط همین‌جا و فقط یک‌بار برمی‌گردد
      codes: codes.map((c) => c.raw),
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** تولید N کد یکتار (unique) — raw code فقط در این response یک‌بار دیده می‌شود */
async function generateCodesTx(client, campaignId, count, expiresAt) {
  const used = new Set();
  const { rows: existing } = await client.query(
    'SELECT code_hash FROM coupons WHERE campaign_id = $1',
    [campaignId]
  );
  for (const r of existing) used.add(r.code_hash);

  const codes = [];
  for (let i = 0; i < count; i++) {
    let raw, hash, tries = 0;
    do {
      raw = generateCode();
      hash = crypto.createHash('sha256').update(normalizeCode(raw)).digest('hex');
      tries++;
      if (tries > 20) throw new Error('code collision loop');
    } while (used.has(hash));
    used.add(hash);
    codes.push({ raw, hash, last4: normalizeCode(raw).slice(-4) });
  }

  for (let i = 0; i < codes.length; i += 100) {
    const chunk = codes.slice(i, i + 100);
    const values = [];
    const params = [];
    chunk.forEach((c, j) => {
      params.push(campaignId, c.hash, c.last4, expiresAt);
      values.push(`($${params.length - 3}, $${params.length - 2}, $${params.length - 1}, $${params.length})`);
    });
    await client.query(
      `INSERT INTO coupons (campaign_id, code_hash, code_last4, expires_at) VALUES ${values.join(',')}`,
      params
    );
  }
  return codes;
}

async function generateMoreCodes(campaignId, count) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT expires_at FROM coupon_campaigns WHERE id = $1', [campaignId]);
    if (!rows.length) throw new NotFoundError('کمپین پیدا نشد.');
    const codes = await generateCodesTx(client, campaignId, count, rows[0].expires_at);
    await client.query('COMMIT');
    return codes.map((c) => c.raw);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateCampaign(id, input) {
  const schema = z.object({
    name: z.string().trim().min(3).max(120).optional(),
    isActive: z.boolean().optional(),
    maxUses: z.coerce.number().int().min(1).nullable().optional(),
    expiresAt: z.coerce.date().optional(),
  });
  const data = schema.parse(input);
  const sets = [];
  const params = [];
  for (const [key, col] of [['name', 'name'], ['isActive', 'is_active'], ['maxUses', 'max_uses'], ['expiresAt', 'expires_at']]) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (!sets.length) throw new ValidationError('فیلدی برای تغییر نفرستادی.');
  params.push(id);
  const { rowCount } = await pool.query(
    `UPDATE coupon_campaigns SET ${sets.join(', ')} WHERE id = $${params.length}`,
    params
  );
  if (!rowCount) throw new NotFoundError('کمپین پیدا نشد.');
  return true;
}

async function deleteCampaign(id) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS used FROM coupons WHERE campaign_id = $1 AND (claimed_at IS NOT NULL OR redeemed_at IS NOT NULL)`,
    [id]
  );
  if (rows[0].used > 0) {
    throw new BusinessRuleError('این کمپین کد مصرف‌شده دارد — فقط غیرفعالش کن.', 'CAMPAIGN_IN_USE', 400);
  }
  const { rowCount } = await pool.query('DELETE FROM coupon_campaigns WHERE id = $1', [id]);
  if (!rowCount) throw new NotFoundError('کمپین پیدا نشد.');
  return true;
}

module.exports = {
  claim,
  myCoupons,
  listCampaigns,
  createCampaign,
  generateMoreCodes,
  updateCampaign,
  deleteCampaign,
  normalizeCode,
  hashCode,
};

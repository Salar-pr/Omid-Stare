'use strict';
/**
 * users.service — profile / name / password / avatar + آمار حساب
 */
const argon2 = require('argon2');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { pool } = require('../../db/client');
const config = require('../../config');
const { ValidationError, AuthError, BusinessRuleError } = require('../../utils/errors');
const { z } = require('zod');

const nameSchema = z.object({
  name: z.string().trim().min(2, 'اسمت خیلی کوتاهه').max(80, 'اسمت خیلی بلندە'),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز فعلی رو وارد کن!'),
  newPassword: z
    .string()
    .min(8, 'رمز جدید حداقل ۸ کاراکتر باشه')
    .max(128)
    .regex(/[a-zA-Z]/, 'رمز باید حروف انگلیسی هم داشته باشه')
    .regex(/\d/, 'رمز باید عدد هم داشته باشه'),
});

async function getMe(req) {
  const uid = req.user.id;
  const [counts] = await Promise.all([
    pool.query(
      `SELECT
         (SELECT count(*) FROM orders WHERE user_id = $1 AND status <> 'cancelled')::int AS orders,
         (SELECT COALESCE(sum(quantity),0)::int FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE c.user_id = $1) AS cart_qty,
         (SELECT count(*)::int FROM user_wishlist WHERE user_id = $1) AS wishlist,
         (SELECT count(*)::int FROM coupons WHERE assigned_user_id = $1 AND redeemed_at IS NULL AND is_active AND expires_at > now()) AS active_coupons`,
      [uid]
    ),
  ]);

  const { rows: coupons } = await pool.query(
    `SELECT c.id, c.code_last4, c.claimed_at, c.redeemed_at, c.expires_at, c.is_active,
            cm.name AS campaign_name, cm.discount_type, cm.discount_value, cm.target_product_id,
            p.name AS target_product_name
       FROM coupons c
       JOIN coupon_campaigns cm ON cm.id = c.campaign_id
       LEFT JOIN products p ON p.id = cm.target_product_id
      WHERE c.assigned_user_id = $1
      ORDER BY COALESCE(c.redeemed_at, c.expires_at) DESC NULLS LAST, c.claimed_at DESC`,
    [uid]
  );

  return {
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      avatarUrl: req.user.avatar_url,
      role: req.user.role,
      createdAt: req.user.created_at,
    },
    counts: counts.rows[0],
    coupons: coupons.rows.map((r) => ({
      id: r.id,
      codeLast4: r.code_last4,
      campaignName: r.campaign_name,
      discountType: r.discount_type,
      discountValue: r.discount_value,
      targetProduct: r.target_product_name || null,
      claimedAt: r.claimed_at,
      redeemedAt: r.redeemed_at,
      expiresAt: r.expires_at,
      state: r.redeemed_at ? 'redeemed' : r.expires_at < new Date() ? 'expired' : r.is_active ? 'active' : 'invalid',
    })),
  };
}

async function updateName(req, input) {
  const data = nameSchema.parse(input);
  const { rows } = await pool.query(
    `UPDATE users SET name = $1, updated_at = now() WHERE id = $2
     RETURNING id, name, email, avatar_url, role, created_at, last_login_at`,
    [data.name, req.user.id]
  );
  return rows[0];
}

async function changePassword(req, input) {
  const data = passwordSchema.parse(input);
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!rows.length) throw new AuthError('کاربر پیدا نشد.');

  let ok = false;
  try {
    ok = await argon2.verify(rows[0].password_hash, data.currentPassword);
  } catch (e) {
    ok = false;
  }
  if (!ok) throw new AuthError('رمز فعلی اشتباهه!');

  const hash = await argon2.hash(data.newPassword, { type: argon2.argon2id });
  await pool.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user.id]);
  return true;
}

const ALLOWED_AVATAR_EXT = { '.jpg': 'jpg', '.jpeg': 'jpg', '.png': 'png', '.webp': 'webp' };

/** آپلود آواتار (multipart field: file) — avatarUrl=null پاک می‌کند */
async function uploadAvatar(req, file) {
  if (!file) {
    await pool.query('UPDATE users SET avatar_url = NULL, updated_at = now() WHERE id = $1', [req.user.id]);
    return { avatarUrl: null };
  }
  const name = file.filename || '';
  const ext = path.extname(name).toLowerCase();
  const mime = file.mimetype || '';
  if (!ALLOWED_AVATAR_EXT[ext] || !mime.startsWith('image/')) {
    throw new ValidationError('فقط عکس JPG/PNG/WebP مجازه.');
  }
  const buf = await file.toBuffer();
  if (buf.length > config.maxAvatarBytes) {
    throw new ValidationError('عکس بزرگ‌تر از حد مجازە — یه عکس سبک‌تر بذار.');
  }
  const filename = `avatar_${crypto.randomUUID()}.${ALLOWED_AVATAR_EXT[ext]}`;
  const destDir = path.join(config.uploadDir, 'avatars');
  await fs.promises.mkdir(destDir, { recursive: true });
  await fs.promises.writeFile(path.join(destDir, filename), buf);

  const { rows } = await pool.query(
    `UPDATE users SET avatar_url = $1, updated_at = now() WHERE id = $2
     RETURNING avatar_url`,
    [`/media/avatars/${filename}`, req.user.id]
  );

  // حذف آواتار قبلی (best-effort)
  const oldUrl = req.user.avatar_url || '';
  if (oldUrl.startsWith('/media/avatars/')) {
    const oldFile = path.join(config.uploadDir, 'avatars', path.basename(oldUrl));
    fs.promises.unlink(oldFile).catch(() => {});
  }
  return { avatarUrl: rows[0].avatar_url };
}

module.exports = { getMe, updateName, changePassword, uploadAvatar };

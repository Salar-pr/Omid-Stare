'use strict';
/**
 * DB Schema — Drizzle ORM (PostgreSQL)
 *
 * تصمیمات modeling:
 * - IDها: UUID (defaultRandom) — قابل حدس نیست، بدون sequence عمومی.
 * - پول: INTEGER تومان (float ممنوع).
 * - رابطه‌های واقعی relational هستند (orders↔items, user↔cart, album↔tracks, coupon↔campaign).
 * - attributes نمایشی که query/relation نیستند (sizes, colors, gallery, specs, features)
 *   به‌صورت JSONB در خود products ذخیره می‌شوند — چون نه FK می‌خورند نه join.
 * - coupon code هرگز plaintext نیست: فقط sha256 hash + ۴ حرف آخر.
 */
const {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  check,
  bigint,
} = require('drizzle-orm/pg-core');

function now(name){ return timestamp(name, { withTimezone: true }).defaultNow().notNull(); }

// ============ USERS & SESSIONS ============
const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('customer'), // customer | admin
  isActive: boolean('is_active').notNull().default(true),
  createdAt: now('created_at'),
  updatedAt: now('updated_at'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

// Session = opaque token در cookie؛ در DB فقط sha256 hash آن نگه می‌شود.
const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  userAgent: text('user_agent'),
  ip: text('ip'),
  createdAt: now('created_at'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ============ CATALOG ============
const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    nameEn: text('name_en').notNull().default(''),
    description: text('description').notNull().default(''),
    price: integer('price').notNull(), // تومان
    compareAtPrice: integer('compare_at_price'),
    stock: integer('stock').notNull().default(0),
    category: text('category').notNull().default('عمومی'),
    badge: text('badge'),
    isActive: boolean('is_active').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    image: text('image').notNull().default(''),
    // attributes نمایشی (JSONB — نه relation):
    sizes: jsonb('sizes').$type([]).notNull().default([]),
    colors: jsonb('colors').$type([]).notNull().default([]),
    gallery: jsonb('gallery').$type([]).notNull().default([]),
    specs: jsonb('specs').$type([]).notNull().default([]),
    features: jsonb('features').$type([]).notNull().default([]),
    createdAt: now('created_at'),
    updatedAt: now('updated_at'),
  },
  (t) => [
    index('ix_products_slug').on(t.slug),
    index('ix_products_category').on(t.category),
    index('ix_products_active').on(t.isActive),
    index('ix_products_sort').on(t.sortOrder),
  ]
);

const albums = pgTable(
  'albums',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    titleFa: text('title_fa').notNull().default(''),
    year: integer('year').notNull(), // سال شمسی نمایشی
    genre: text('genre').notNull().default(''),
    coverImage: text('cover_image').notNull().default(''),
    description: text('description').notNull().default(''),
    isPublished: boolean('is_published').notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: now('created_at'),
    updatedAt: now('updated_at'),
  },
  (t) => [index('ix_albums_sort').on(t.sortOrder, t.isPublished)]
);

const albumTracks = pgTable(
  'album_tracks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    albumId: uuid('album_id').notNull().references(() => albums.id, { onDelete: 'cascade' }),
    trackNumber: integer('track_number').notNull(),
    title: text('title').notNull(),
    duration: integer('duration').notNull().default(0), // ثانیه
    audioUrl: text('audio_url'),
    isPublished: boolean('is_published').notNull().default(true),
  },
  (t) => [
    index('ix_tracks_album').on(t.albumId, t.trackNumber),
    uniqueIndex('uq_tracks_album_number').on(t.albumId, t.trackNumber),
  ]
);

// ============ CART ============
const carts = pgTable('carts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: now('created_at'),
  updatedAt: now('updated_at'),
});

const cartItems = pgTable(
  'cart_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cartId: uuid('cart_id').notNull().references(() => carts.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull().default(1),
    selectedSize: text('selected_size'),
    selectedColor: text('selected_color'),
    createdAt: now('created_at'),
  },
  (t) => [
    index('ix_cart_items_cart').on(t.cartId),
    uniqueIndex('uq_cart_items_variant').on(t.cartId, t.productId, t.selectedSize, t.selectedColor),
    check('ck_cart_items_qty', 'quantity > 0'),
  ]
);

// ============ ORDERS ============
const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNumber: text('order_number').notNull().unique(), // OR-1405-000123
    userId: uuid('user_id').notNull().references(() => users.id),
    status: text('status').notNull().default('pending'),
    // pending|confirmed|processing|shipped|delivered|cancelled
    paymentStatus: text('payment_status').notNull().default('unpaid'),
    // unpaid|pending|paid|failed|refunded
    subtotal: integer('subtotal').notNull().default(0),
    discountAmount: integer('discount_amount').notNull().default(0),
    shippingAmount: integer('shipping_amount').notNull().default(0),
    totalAmount: integer('total_amount').notNull().default(0),
    couponId: uuid('coupon_id'),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    customerEmail: text('customer_email'),
    shippingAddress: text('shipping_address').notNull(),
    city: text('city'),
    postalCode: text('postal_code'),
    notes: text('notes'),
    createdAt: now('created_at'),
    updatedAt: now('updated_at'),
  },
  (t) => [
    index('ix_orders_user').on(t.userId),
    index('ix_orders_status').on(t.status),
    index('ix_orders_created').on(t.createdAt),
    index('ix_orders_payment').on(t.paymentStatus),
  ]
);

// snapshot کامل — بعداً تغییر محصول نباید order قدیمی را عوض کند
const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    productNameSnapshot: text('product_name_snapshot').notNull(),
    unitPrice: integer('unit_price').notNull(),
    quantity: integer('quantity').notNull(),
    selectedSize: text('selected_size'),
    selectedColor: text('selected_color'),
    lineTotal: integer('line_total').notNull(),
  },
  (t) => [index('ix_order_items_order').on(t.orderId)]
);

// هر تغییر status با actor + timestamp ثبت می‌شود
const orderStatusHistory = pgTable(
  'order_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actorId: uuid('actor_id'),
    actorName: text('actor_name').notNull().default('system'),
    note: text('note'),
    createdAt: now('created_at'),
  },
  (t) => [index('ix_order_hist_order').on(t.orderId, t.createdAt)]
);

// ============ WISHLIST ============
const userWishlist = pgTable(
  'user_wishlist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    createdAt: now('created_at'),
  },
  (t) => [
    uniqueIndex('uq_wishlist_user_product').on(t.userId, t.productId),
    index('ix_wishlist_user').on(t.userId),
  ]
);

// ============ COUPONS ============
// Campaign = کمپین (قوانین تخفیف). Coupon = کد فیزیکی یک‌بار مصرف.
const couponCampaigns = pgTable(
  'coupon_campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    discountType: text('discount_type').notNull(), // percentage | fixed
    discountValue: integer('discount_value').notNull(),
    targetProductId: uuid('target_product_id').references(() => products.id, { onDelete: 'set null' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    maxUses: integer('max_uses'), // null = بی‌نهایت
    redeemedCount: integer('redeemed_count').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: now('created_at'),
  },
  (t) => [index('ix_campaigns_active').on(t.isActive, t.expiresAt)]
);

const coupons = pgTable(
  'coupons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => couponCampaigns.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull().unique(), // sha256(code normalized)
    codeLast4: text('code_last4').notNull(),
    assignedUserId: uuid('assigned_user_id').references(() => users.id, { onDelete: 'set null' }),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }),
    redeemedOrderId: uuid('redeemed_order_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: now('created_at'),
  },
  (t) => [
    index('ix_coupons_hash').on(t.codeHash),
    index('ix_coupons_assigned').on(t.assignedUserId),
    index('ix_coupons_redeemed').on(t.redeemedAt),
    index('ix_coupons_campaign').on(t.campaignId),
  ]
);

// ============ CONTACT ============
const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    message: text('message').notNull(),
    status: text('status').notNull().default('unread'), // unread|read|archived
    createdAt: now('created_at'),
  },
  (t) => [index('ix_contact_status').on(t.status, t.createdAt)]
);

// ============ SITE CONTENT (mini CMS) ============
const siteContent = pgTable('site_content', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull().default({}),
  updatedAt: now('updated_at'),
});

// ============ REVIEWS & QUESTIONS ============
const reviews = pgTable(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    rating: integer('rating').notNull(),
    body: text('body').notNull(),
    isApproved: boolean('is_approved').notNull().default(false),
    createdAt: now('created_at'),
    updatedAt: now('updated_at'),
  },
  (t) => [
    uniqueIndex('uq_reviews_user_product').on(t.userId, t.productId),
    index('ix_reviews_product').on(t.productId, t.isApproved),
  ]
);

const productQuestions = pgTable(
  'product_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    authorName: text('author_name').notNull(),
    question: text('question').notNull(),
    answer: text('answer'),
    isPublished: boolean('is_published').notNull().default(true),
    createdAt: now('created_at'),
  },
  (t) => [index('ix_questions_product').on(t.productId, t.isPublished)]
);

// ============ NOTIFICATIONS ============
const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(), // order_created, contact_message, ...
    payload: jsonb('payload').notNull().default({}),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: now('created_at'),
  },
  (t) => [index('ix_notif_read').on(t.isRead, t.createdAt)]
);

// ============ SEQUENCES ============
const appSequences = pgTable('app_sequences', {
  key: text('key').primaryKey(),
  lastValue: bigint('last_value', { mode: 'number' }).notNull().default(0),
});

module.exports = {
  users,
  sessions,
  products,
  albums,
  albumTracks,
  carts,
  cartItems,
  orders,
  orderItems,
  orderStatusHistory,
  userWishlist,
  couponCampaigns,
  coupons,
  contactMessages,
  siteContent,
  reviews,
  productQuestions,
  notifications,
  appSequences,
};

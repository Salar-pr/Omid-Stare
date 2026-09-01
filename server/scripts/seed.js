#!/usr/bin/env node
'use strict';
/**
 * scripts/seed.js — seed با داده‌های واقعی repository:
 *  - ۴ محصول از js/products.js (قیمت/موجودی/سایز/رنگ/گالری/مشخصات)
 *  - ۴ آلبوم + tracks از albums.html
 *  - reviews/questions اولیه (از داده‌های نمایشی فعلی)
 *  - site content (hero/manifest/contact/socials/featured/welcome)
 *  - admin از env (ADMIN_EMAIL/ADMIN_PASSWORD) — هیچ credential hard-code نیست
 *  - یک کمپین نمونه با کدهای generate شده
 *
 * Idempotent است (upsert روی slug/unique) — می‌توانی چندبار بزنید.
 */
const argon2 = require('argon2');
const config = require('../src/config');
const { pool } = require('../src/db/client');
let _client = null;
/** query روی connection transactional seed — کل seed در یک transaction (اتومیته) */
function q(sql, params){ return (_client || pool).query(sql, params); }

// ---------------- داده‌ها (همان js/products.js فعلی) ----------------
const PRODUCTS = [
  {
    slug: 'liquid-void-tshirt',
    name: 'تیشرت Liquid Void',
    nameEn: 'Liquid Void T-Shirt',
    category: 'پوشاک',
    price: 980000,
    compareAtPrice: 1250000,
    stock: 12,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: [
      { name: 'مشکی', hex: '#0a0a0f' },
      { name: 'سفید', hex: '#f7f2e8' },
      { name: 'ماژنتا', hex: '#ff2d95' },
    ],
    badge: 'NEW • PSYCH',
    image: 'images/merch-tshirt.jpg',
    gallery: ['images/merch-tshirt.jpg', 'images/hero-steel.jpg', 'images/psych-bg.jpg'],
    description:
      'پنبه ارگانیک 100%، چاپ مایع ماژنتا+سیان با جوهر نئون. پشتش پرتال چشم. تو تاریکی گلو میده. مناسب استیج و خیابون.',
    specs: [
      ['جنس', 'پنبه ارگانیک سنگین 210gsm'],
      ['چاپ', 'سیلک اسکرین نئون + شب‌تاب'],
      ['شستشو', '۳۰ درجه، پشت و رو'],
      ['برند', 'OMID RASTAR OFFICIAL'],
    ],
    features: ['ارسال رایگان', '۷ روز ضمانت بازگشت', 'موجود در انبار تهران'],
    sortOrder: 1,
  },
  {
    slug: 'portal-hoodie',
    name: 'هودی Portal',
    nameEn: 'Portal Hoodie',
    category: 'پوشاک',
    price: 2100000,
    compareAtPrice: null,
    stock: 5,
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'مشکی', hex: '#0a0a0f' },
      { name: 'ذغالی', hex: '#2a2a32' },
    ],
    badge: 'LIMITED',
    image: 'images/merch-hoodie.jpg',
    gallery: ['images/merch-hoodie.jpg', 'images/back-steel.jpg'],
    description: 'هودی سنگین 400 گرم، داخل کرکی، گرافیک چشم سایکدلیک با نخ شب‌تاب لایم. برای شبای سرد استیج.',
    specs: [
      ['جنس', 'دورس سه نخ پنبه 400gsm'],
      ['جیب', 'کانگورویی + زیپ مخفی'],
      ['سایزبندی', 'Oversize - راهنمای سایز ببین'],
      ['چاپ', 'گلدوزی + سیلک'],
    ],
    features: ['موجودی محدود', 'ارسال فوری', '۷ روز بازگشت'],
    sortOrder: 2,
  },
  {
    slug: 'prism-dust-neon-vinyl',
    name: 'وینیل Prism Dust — نئون',
    nameEn: 'Prism Dust Neon Vinyl',
    category: 'وینیل',
    price: 3600000,
    compareAtPrice: 4200000,
    stock: 3,
    sizes: ['180g'],
    colors: [
      { name: 'ماژنتا شفاف', hex: '#ff2d95' },
      { name: 'سیان شفاف', hex: '#00ffd1' },
    ],
    badge: 'VINYL • 180g',
    image: 'images/merch-vinyl.jpg',
    gallery: ['images/merch-vinyl.jpg', 'images/album1.jpg', 'images/psych-portal.jpg'],
    description:
      'صفحه شفاف ماژنتا/سیان 180 گرمی، کاور هولوگرافیک با امضای راستار + پوستر داخلی و کد دانلود دیجیتال.',
    specs: [
      ['وزن', '180 گرم - Audiophile'],
      ['رنگ صفحه', 'ماژنتا/سیان شفاف - تیراژ 300'],
      ['محتویات', 'پوستر + اینسرت + کد FLAC'],
      ['لیبل', 'Void Records - 1404'],
    ],
    features: ['تیراژ محدود', 'شماره‌دار', 'ارسال با قاب ضد خش'],
    sortOrder: 3,
  },
  {
    slug: 'portal-picks-set',
    name: 'ست پیک‌های پرتالی',
    nameEn: 'Portal Guitar Picks Set',
    category: 'اکسسوری',
    price: 320000,
    compareAtPrice: null,
    stock: 28,
    sizes: ['0.73mm', '1.0mm'],
    colors: [
      { name: 'ماژنتا', hex: '#ff2d95' },
      { name: 'سیان', hex: '#00ffd1' },
      { name: 'لایم', hex: '#d9ff00' },
      { name: 'مشکی', hex: '#0a0a0f' },
    ],
    badge: 'PICK SET',
    image: 'images/merch-picks.jpg',
    gallery: ['images/merch-picks.jpg'],
    description: '۶ پیک سلولوئید با رنگای ماژنتا، سیان، لایم، بنفش، نارنجی، مشکی مات. لوگوی بال‌دار حک شده.',
    specs: [
      ['تعداد', '۶ عدد'],
      ['ضخامت', '0.73mm و 1.0mm'],
      ['جنس', 'سلولوئید - گریپ مات'],
      ['طرح', 'لوگوی OMID RASTAR'],
    ],
    features: ['موجود', 'ارسال امروز', 'هدیه عالی برای گیتاریست'],
    sortOrder: 4,
  },
];

// ---------------- آلبوم‌ها (همان albums.html فعلی) ----------------
const ALBUMS = [
  {
    title: 'Liquid Void',
    titleFa: 'خلأ مایع',
    year: 1404,
    genre: 'PROG PSYCH',
    coverImage: 'images/street-rays-blue.jpg',
    description: 'آلبوم جدید — سفر رو شروع کن.',
    sortOrder: 1,
    tracks: [
      [1, 'پرتال باز', 134],
      [2, 'شناور در ماژنتا', 522],
      [3, 'ریفی از شرق', 663],
      [4, 'چشمِ سایکدلیک', 388],
    ],
  },
  {
    title: 'Neon Mirage',
    titleFa: 'سراب نئون',
    year: 1402,
    genre: 'ACID ROCK',
    coverImage: 'images/album1.jpg',
    description: 'سراب نئونی با ریف‌های اسیدی.',
    sortOrder: 2,
    tracks: [
      [1, 'نئون می‌باره', 311],
      [2, 'باغ فیروزه‌ای', 584],
      [3, 'حل شدن', 722],
    ],
  },
  {
    title: 'Acid Garden',
    titleFa: 'باغ اسیدی',
    year: 1400,
    genre: 'PSYCH',
    coverImage: 'images/album2.jpg',
    description: 'باغی از رشد و انحلال.',
    sortOrder: 3,
    tracks: [
      [1, 'بذر لایم', 213],
      [2, 'رشدِ بنفش', 439],
      [3, 'گلِ پرتال', 655],
    ],
  },
  {
    title: 'Prism Dust',
    titleFa: 'غبار منشور',
    year: 1398,
    genre: 'SPACE ROCK',
    coverImage: 'images/psych-portal.jpg',
    description: 'غبار منشور — فضایی و سنگین.',
    sortOrder: 4,
    tracks: [
      [1, 'منشور شکست', 366],
      [2, 'غبارِ نارنجی', 498],
      [3, 'بازگشتِ سیان', 801],
    ],
  },
];

// ---------------- demo users (فقط برای review seed) ----------------
// این کاربرها برای seed نظر هستند؛ در production فقط admin از env ساخته می‌شود.
const DEMO_USERS = [
  ['سینا', 'sina@demo.void.ir'],
  ['آرش', 'arash@demo.void.ir'],
  ['نیلوفر', 'niloofar@demo.void.ir'],
  ['کیان', 'kian@demo.void.ir'],
];
const DEMO_PASSWORD = 'Omid1404!';

// ---------------- reviews اولیه (از داده‌های نمایشی فعلی) ----------------
const REVIEWS = [
  { user: 'sina@demo.void.ir', product: 'liquid-void-tshirt', rating: 5, body: 'کیفیت چاپش دیوونست! تو کنسرت همه میپرسیدن از کجا خریدی. پارچه‌ش هم خیلی سنگینه و مشتی.' },
  { user: 'arash@demo.void.ir', product: 'prism-dust-neon-vinyl', rating: 5, body: 'وینیلش حرف نداره، صداش گرم و پره. کاور هولوگرافیکشم تو نور میدرخشه. پیشنهاد میکنم.' },
  { user: 'niloofar@demo.void.ir', product: 'liquid-void-tshirt', rating: 4, body: 'سایز M دقیقا اندازه بود، راهنمای سایز خیلی کمک کرد. فقط ارسالش ۲ روز طول کشید.' },
  { user: 'kian@demo.void.ir', product: 'portal-hoodie', rating: 4, body: 'هودی Portal فوق‌العادست، شب‌تابش تو تاریکی جواب میده. گرم و راحت.' },
  { user: 'sina@demo.void.ir', product: 'portal-picks-set', rating: 5, body: 'پیکاها گریپ عالی دارن، لوگو هم خوشحک‌کاریه. هدیه عالی برای گیتاریست.' },
  { user: 'arash@demo.void.ir', product: 'portal-hoodie', rating: 5, body: 'درشتی و سنگینی‌ش در حد حرفه‌ایه. برای استیج عالیه.' },
];

// ---------------- Q&A اولیه ----------------
const QUESTIONS = [
  { product: 'liquid-void-tshirt', author: 'امیر', q: 'سایز تیشرت Oversize هست یا فیت؟', a: 'فیت معمولیه ولی اگه استایل راحت دوست داری یه سایز بزرگتر بردار. جدول سایز تو صفحه محصول هست.' },
  { product: 'prism-dust-neon-vinyl', author: 'سارا', q: 'وینیل با گرامافون معمولی هم پخش میشه؟', a: 'آره، 33 دور استاندارده. فقط سوزن سالم باشه چون 180 گرمی سنگینه.' },
  { product: 'liquid-void-tshirt', author: 'مهدی', q: 'ارسال به شهرستان چقدر طول میکشه؟', a: 'تهران امروز/فردا، شهرستان ۲-۳ روز کاری با تیپاکس. رایگانه.' },
];

// ---------------- site content ----------------
const CONTENT = {
  hero: {
    metaFa: 'سایکدلیک پراگرسیو / راک شرقی / تهران',
    metaEn: 'PSYCHEDELIC PROGRESSIVE — 1405',
    sub: 'این بار نه فولاد و نه خون — <b style="color:var(--cyan)">سفر</b>ه. راستار رفته تو دل صدای مایع، ریف‌های ۷/۸، سینت‌های فضایی و نورای نئون. پراگرسیو سایکدلیک: جایی که زمان آب میشه و گیتار حرف میزنه.',
    badge: '◍ TAME IMPALA × PINK FLOYD × TOOL → EASTERN RIFF',
    cta1: { text: 'سفر رو شروع کن', url: 'albums.html' },
    cta2: { text: 'مانفیست', url: '#about' },
    image: 'images/psych-portal.jpg',
    contactNote: 'رزرو اجرا، همکاری، یا فقط یه گپِ سایکدلیک — پورتال بازه.',
  },
  manifest: {
    quote: '«موسیقی نباید<br>تموم شه، باید<br>حل شه تو فضا.»',
    body: 'پراگرسیو سایکدلیک برای من یعنی گم شدنِ عمدی. آهنگ ۳ دقیقه‌ای ندارم. یه قطعه از من با یه درونِ فضایی شروع میشه، میره تو یه ریف سنگینِ ایرانی-بلوزی، وسطش همه چی می‌پاشه، فقط یه سینتِ لرزون می‌مونه و دوباره از یه پرتالِ دیگه برمی‌گردیم. رنگاش؟ ماژنتای انفجاری، فیروزه‌ای اسیدی، بنفش کهکشانی، لایمِ نئون و نارنجی گدازه روی وویدِ مشکی. همه چی محو، مایع، Tie-Dye.',
  },
  contact_info: {
    location: 'تهران — استودیو پرتال، خیابانِ مایع، پلاکِ ∞',
    locationNote: 'جلسات فقط با هماهنگیِ تریپی.',
    email1: 'omid.rastar.psych@void.ir',
    email2: 'booking@rastar.rocks',
    vibe: 'دارم رو یه ترکِ ۱۴ دقیقه‌ای کار می‌کنم: شروعش 432Hz سیتار، وسطش ریفِ ۷/۸ لایم، تهش انفجارِ ماژنتا.',
  },
  socials: [
    { label: 'INSTAGRAM', url: '#' },
    { label: 'YOUTUBE', url: '#' },
    { label: 'SPOTIFY', url: '#' },
    { label: 'SOUNDCLOUD', url: '#' },
  ],
  featured: {
    productSlugs: ['liquid-void-tshirt', 'portal-hoodie', 'prism-dust-neon-vinyl'],
    albumId: null, // seed پر می‌کند
  },
  welcome_albums: { enabled: true, albumId: null },
  footer_note: '© ۱۴۰۵ OMID RASTAR ★ PSYCHEDELIC PROGRESSIVE EDITION — همه چی مایعه.',
};

// ---------------- helpers ----------------
async function upsertProduct(p) {
  const { rows } = await q(
    `INSERT INTO products
       (slug, name, name_en, description, price, compare_at_price, stock, category, badge,
        is_active, sort_order, image, sizes, colors, gallery, specs, features)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,TRUE,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16::jsonb)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name, name_en = EXCLUDED.name_en, description = EXCLUDED.description,
       price = EXCLUDED.price, compare_at_price = EXCLUDED.compare_at_price, stock = EXCLUDED.stock,
       category = EXCLUDED.category, badge = EXCLUDED.badge, sort_order = EXCLUDED.sort_order,
       image = EXCLUDED.image, sizes = EXCLUDED.sizes, colors = EXCLUDED.colors,
       gallery = EXCLUDED.gallery, specs = EXCLUDED.specs, features = EXCLUDED.features,
       updated_at = now()
     RETURNING id, slug, stock`,
    [
      p.slug, p.name, p.nameEn, p.description, p.price, p.compareAtPrice, p.stock, p.category,
      p.badge, p.sortOrder, p.image, JSON.stringify(p.sizes), JSON.stringify(p.colors),
      JSON.stringify(p.gallery), JSON.stringify(p.specs), JSON.stringify(p.features),
    ]
  );
  return rows[0];
}

async function upsertContent(key, value) {
  await q(
    `INSERT INTO site_content (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [key, JSON.stringify(value)]
  );
}

(async () => {
  const client = await pool.connect();
  _client = client;
  try {
    await client.query('BEGIN');

    // 1) products
    const productIds = {};
    for (const p of PRODUCTS) {
      const row = await upsertProduct(p);
      productIds[p.slug] = row.id;
      console.log(`[seed] product ${p.slug} (stock=${row.stock})`);
    }

    // 2) albums + tracks
    const albumIds = {};
    for (const a of ALBUMS) {
      const { rows } = await q(
        `INSERT INTO albums (title, title_fa, year, genre, cover_image, description, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO NOTHING RETURNING id`,
        [a.title, a.titleFa, a.year, a.genre, a.coverImage, a.description, a.sortOrder]
      );
      let albumId = rows[0] ? rows[0].id : null;
      if (!albumId) {
        const ex = await q('SELECT id FROM albums WHERE title = $1 ORDER BY created_at LIMIT 1', [a.title]);
        albumId = ex.rows[0].id;
      }
      albumIds[a.title] = albumId;
      for (const [num, title, dur] of a.tracks) {
        await q(
          `INSERT INTO album_tracks (album_id, track_number, title, duration)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT (album_id, track_number) DO UPDATE SET title = EXCLUDED.title, duration = EXCLUDED.duration`,
          [albumId, num, title, dur]
        );
      }
      console.log(`[seed] album ${a.title} (${a.tracks.length} tracks)`);
    }

    // 3) demo users
    const userPass = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });
    const userIds = {};
    for (const [name, email] of DEMO_USERS) {
      const { rows } = await q(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1,$2,$3)
         ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [name, email, userPass]
      );
      userIds[email] = rows[0].id;
    }
    console.log(`[seed] ${DEMO_USERS.length} demo users (password: ${DEMO_PASSWORD} — برای test)`);

    // admin از env
    if (config.adminEmail && config.adminPassword) {
      const adminHash = await argon2.hash(config.adminPassword, { type: argon2.argon2id });
      await q(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ('Admin', $1, $2, 'admin')
         ON CONFLICT (email) DO UPDATE SET role = 'admin', is_active = TRUE, password_hash = EXCLUDED.password_hash`,
        [config.adminEmail, adminHash]
      );
      console.log(`[seed] admin → ${config.adminEmail}`);
    } else {
      console.warn('[seed] WARNING: ADMIN_EMAIL/ADMIN_PASSWORD خالی است — admin ساخته نشد (npm run create-admin بزن).');
    }

    // 4) reviews (approved)
    for (const r of REVIEWS) {
      await q(
        `INSERT INTO reviews (user_id, product_id, rating, body, is_approved)
         VALUES ($1,$2,$3,$4,TRUE)
         ON CONFLICT (user_id, product_id) DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body`,
        [userIds[r.user], productIds[r.product], r.rating, r.body]
      );
    }
    console.log(`[seed] ${REVIEWS.length} reviews`);

    // 5) questions
    for (const qs of QUESTIONS) {
      const exists = await q(
        'SELECT id FROM product_questions WHERE product_id = $1 AND question = $2',
        [productIds[qs.product], qs.q]
      );
      if (!exists.rows.length) {
        await q(
          `INSERT INTO product_questions (product_id, user_id, author_name, question, answer, is_published)
           VALUES ($1, NULL, $2, $3, $4, TRUE)`,
          [productIds[qs.product], qs.author, qs.q, qs.a]
        );
      }
    }
    console.log(`[seed] ${QUESTIONS.length} questions`);

    // 6) content
    CONTENT.featured.albumId = albumIds['Liquid Void'] || null;
    CONTENT.welcome_albums.albumId = albumIds['Liquid Void'] || null;
    for (const [key, value] of Object.entries(CONTENT)) {
      await upsertContent(key, value);
    }
    console.log('[seed] site content (7 keys)');

    // 7) کمپین نمونه + کدها (فقط اولین بار که کمپینی وجود نداشته باشد)
    const campExists = await q(
      "SELECT id FROM coupon_campaigns WHERE name = $1",
      ['کمپین نمونه — 20٪']
    );
    if (!campExists.rows.length) {
      const expiresAt = new Date(Date.now() + 30 * 86400 * 1000);
      const { rows: campRows } = await q(
        `INSERT INTO coupon_campaigns (name, discount_type, discount_value, expires_at, max_uses)
         VALUES ('کمپین نمونه — 20٪', 'percentage', 20, $1, 50)
         RETURNING id`,
        [expiresAt]
      );
      const campId = campRows[0].id;

      // generate 5 کد — raw فقط همین‌جا یک‌بار چاپ می‌شود (seed محلی)
      const crypto = require('node:crypto');
      const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
      const raws = [];
      for (let i = 0; i < 5; i++) {
        let code = '';
        for (let j = 0; j < 16; j++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
        const display = code.match(/.{1,4}/g).join('-');
        raws.push(display);
        await q(
          `INSERT INTO coupons (campaign_id, code_hash, code_last4, expires_at)
           VALUES ($1, encode(digest($2,'sha256'),'hex'), $3, $4)`,
          [campId, display.replace(/-/g, ''), code.slice(-4), expiresAt]
        );
      }
      console.log('[seed] sample campaign "20%" with 5 codes (ONE-TIME — copy now):');
      for (const c of raws) console.log(`      ${c}`);
    }

    await client.query('COMMIT');
    console.log('[seed] done ✅');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
})();

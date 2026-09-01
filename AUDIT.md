# AUDIT — وضعیت فعلی Repository (قبل از backend)

این فایل resultِ بررسی کامل repository است. هر تصمیم implementation بر اساس همین واقعیت‌ها گرفته شده.

## 0) ساختار فعلی

```
Omid-Stare/
├── index.html, albums.html, shop.html, product.html, cart.html,
│   orders.html, account.html, profile.html, edit-profile.html,
│   wishlist.html, contact.html
├── css/  (main + 10 برگه استایل — هویت Psychedelic/Dark/Neon/RTL)
├── js/   (13 فایل vanilla JS — بدون هیچ framework)
└── images/ (18 فایل)
```
نه `package.json`، نه build، نه backend، نه test، نه CI. یک Frontend استاتیک خالص.

## 1) چه چیزهایی فقط Frontend هستند؟

همه‌چیز. تمام منطق در 13 فایل JS داخل مرورگر اجرا می‌شود:
Auth، Session، Cart، Wishlist، Orders، نمایش محصولات، فرم تماس. هیچ درخواست شبکه‌ای به جز
`@import` فونت گوگل وجود ندارد.

## 2) چه چیزهایی hard-coded هستند؟

| داده | محل |
|---|---|
| ۴ محصول کامل (قیمت، موجودی، سایز، رنگ، گالری، مشخصات، features) | `js/products.js` → `window.PRODUCTS` |
| ۴ نظر محصول | `js/products.js` → `window.PRODUCT_REVIEWS` |
| ۳ پرسش/پاسخ محصول | `js/products.js` → `window.PRODUCT_QA` |
| ۴ آلبوم + ۳ ترک هرکدام (عنوان، سال، ژانر، مدت) | مستقیم داخل `albums.html` |
| Hero / Manifest / Marquee / Social links / فوتر | `index.html` |
| آدرس/ایمیل/وایب تماس | `contact.html` |
| سال‌های دیسکوگرافی در خانه | `index.html` (بند DISCO) و MERCH prices hardcoded |

## 3) چه داده‌هایی با localStorage نگهداری می‌شوند؟

| key | محتوا | خطا |
|---|---|---|
| `or_users` | **کاربرها با رمز plaintext** | 🔴 رمز خالی در مرورگر کاربر |
| `or_session` | `{name,email}` | 🔴 session جعلی کلاینت |
| `or_cart_<email>` | آیتم‌های سبد (نام/قیمت/تصویر) | 🔴 قیمت سمت کلاینت |
| `or_wish_<email>` | آرایه idها | — |
| `or_orders_<email>` | سفارش‌های fake | 🔴 سفارش نمایشی |
| `or_avatar_<email>` | آواتار به‌صورت DataURL | حجم base64 در localStorage |
| `or_welcomed_albums_liquid_void` | پرچم نمایش welcome | ✅ UI preference (مجاز) |
| `or_last_product` | id آخرین محصول | UI cache (مجاز) |

## 4) چه UIهایی از قبل وجود دارند و باید به API وصل شوند؟

- **nav.js**: وضعیت ورود/خروج و لینک حساب (اکنون از `or_session` می‌خواند) → `GET /api/auth/me`
- **account.html/js**: فرم‌های Login + Signup → `POST /api/auth/login|register|logout`
- **shop.html/js**: گرید محصولات + فیلتر (دسته/قیمت/سایز/رنگ/موجودی) + جستجو + سورت + دکمه ویش‌لیست + افزودن به سبد → `GET /api/products` (server-side filter) + cart/wishlist API
- **product.html/js**: گالری، تب‌ها، مشخصات، نظرات، Q&A، related، افزودن به سبد/ویش‌لیست → `GET /api/products/:id` + reviews/questions
- **cart.html/js**: آیتم‌ها + qty + جمع + **checkout نمایشی** → `GET/PATCH/DELETE /api/cart` + `POST /api/orders`
- **orders.html/js**: لیست سفارش‌ها → `GET /api/orders`
- **profile.html/js**: آواتار، نام، ایمیل، آمار سفارش/سبد/ویش‌لیست + خروج → `GET /api/users/me` + logout
- **edit-profile.html/js**: تغییر نام/رمز + آپلود آواتار (اکنون base64 در localStorage) → `PATCH /api/users/me`, `POST /api/users/me/change-password`, `POST /api/users/me/avatar`
- **wishlist.html/js**: گرید علاقه‌مندی‌ها + افزودن به سبد/حذف → `GET/POST/DELETE /api/wishlist`
- **contact.html/js**: فرم تماس (اکنون هیچ جا ذخیره نمی‌شود!) → `POST /api/contact`
- **albums.html**: گرید آلبوم‌ها + welcome promo → `GET /api/albums`
- **index.html**: hero، دیسکوگرافی، مرچ ویژه، سوشال‌ها → `GET /api/content` + `GET /api/albums` + `GET /api/products`

## 5) چه قابلیت‌هایی fake/demo هستند؟

1. **Auth کامل fake**: ثبت‌نام/ورود با مقایسه رمز plaintext در JS مرورگر.
2. **Checkout نمایشی**: `cart.js` سفارش می‌سازد و در `localStorage` می‌ریزد؛ متن صفحه هم می‌گوید «پرداخت نمایشی».
3. **فرم تماس**: فقط toast می‌دهد، هیچ داده‌ای ذخیره نمی‌شود.
4. **نظرات و Q&A**: ثابت از `js/products.js`.
5. **موجودی و قیمت**: قابل ویرایش کلاینت؛ backend برای بررسی وجود ندارد.
6. **کدهای تخفیف**: اصلاً وجود ندارند (بخش جدید).

## 6) چه چیزهایی باید به Database منتقل شوند؟

users, sessions, products (+variants/gallery/specs), albums+tracks, carts+cart_items,
orders+order_items, user_wishlist, coupon_campaigns+coupons, contact_messages,
site_content, reviews, product_questions, notifications, app_sequences.

## 7) refactorهایی که لازم است

- `js/products.js` (داده) حذف می‌شود → `js/api.js` (کلیент API + فرمت‌کننده‌های فارسی) جایگزین می‌شود.
- `js/nav.js`, `account.js`, `cart.js`, `orders.js`, `profile.js`, `edit-profile.js`, `wishlist.js`, `contact.js`, `shop.js`, `product.js` → اتصال به API، حذف هرگونه localStorage برای state بیزینسی.
- **Bug موجود**: `contact.js` به `id`های اشتباه اشاره دارد (`name/email/msg` و `err-*`) درحالی‌که `contact.html` از `cName/cEmail/cMsg` و `eName/eEmail/eMsg` استفاده می‌کند → با ارسال فرم ارور `null.value` می‌دهد. در این پروژه اصلاح می‌شود.
- `fx.js` و `toast.js` دست نمی‌خورند (UX خالص).
- Welcome animation و `or_last_product` به‌عنوان UI preference در localStorage می‌مانند (مجاز طبق spec).

## 8) dependency جدید

- **Frontend**: صفر. (همان HTML/CSS/JS خالص)
- **Backend** (`server/`): fastify, @fastify/cookie, @fastify/static, @fastify/rate-limit,
  @fastify/compress, @fastify/helmet, @fastify/multipart (آپلود آواتار/گالری), drizzle-orm, pg,
  argon2, zod, dotenv — هرکدام دلیل مشخص دارد (server/README.md).
  Test: `node:test` داخلی Node — dependency test framework **نیاز نیست**.

## 9) هویت بصری (باید حفظ شود)

- RTL + فارسی، تم `nemone-4 psych`: پس‌زمینه `#08070f`، نئون‌های magenta `#ff2d95` / cyan `#00ffd1` /
  lime `#d9ff00` / purple / orange، فونت Space Grotesk + Vazirmatn، welcome portal animation،
  vinyl-spin برای آلبوم‌ها، fly-to-cart animation.
- هیچ صفحه‌ای rewrite نمی‌شود؛ فقط data-source عوض می‌شود و loading/error/empty state به‌همین زبان بصری اضافه می‌شود.
- Admin panel می‌تواند چیدمان مدیریتی جدا (sidebar) داشته باشد ولی در همان خانواده رنگی.

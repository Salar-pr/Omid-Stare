# REVIEW — بازبینی کامل (۰۱ سپتامبر ۲۰۲۶ / ۱۰ شهریور ۱۴۰۵)

نتیجه‌ی بازبینی کامل فرانت + بک‌اند + تست E2E واقعی (ثبت‌نام → سبد → کوپن → سفارش).
همه‌ی موارد پایین **در همین کامیت‌ها فیکس شده‌اند** — جز بخش «پیشنهادهای بعدی».

---

# 🔁 دور دوم — بازبینی خط‌به‌خط

## 🔴 باگ‌های بحرانی جدید

### ۱۰. آپلود آواتار و آپلود ادمین **هیچ‌وقت کار نمی‌کرد** (باگ پنهان)
`@fastify/multipart` بدون `attachFieldsToBody` ثبت شده بود → `req.body` برای درخواست‌های
multipart هرگز پر نمی‌شد → هر دو endpoint آپلود فایل را نمی‌دیدند و درخواست را به‌عنوان
«حذف آواتار» پردازش می‌کردند! تست هم هیچ‌وقت آپلود را پوشش نمی‌داد.
**فیکس:** `attachFieldsToBody: true` + تست رگرسیون با FormData واقعی + `bodyLimit`
درست برای دو مسیر آپلود (سقف global 1MB آواتار ۲MBی مجاز را می‌بُرد).

### ۱۱. XSS ذخیره‌شده در نظرات و Q&A
`rv.user`، `rv.body`، `q.question`، `q.author` (ورودی کاربر) بدون escape با `innerHTML`
تزریق می‌شدند → کاربر می‌توانست اسکریپت تزریق کند که برای همه‌ی بازدیدکنندگان صفحه‌ی
محصول اجرا شود. **فیکس:** `escHtml()` در api.js + escape همه‌ی نقاط رندر
(نظرات، Q&A، سفارش‌ها، فروشگاه، ویش‌لیست، سبد، آلبوم‌ها، صفحه‌ی محصول).

### ۱۲. فونت‌های هویت بصری لود نمی‌شدند
CSS به "Space Grotesk" و "Vazirmatn" ارجاع می‌داد ولی هیچ `@font-face` یا لینکی به
Google Fonts در هیچ صفحه‌ای نبود (AUDIT §1 آن را تنها درخواست شبکه‌ی فرانت می‌دانست —
در ری‌فکتور گم شده بود) → سایت با Tahoma رندر می‌شد. **فیکس:** preconnect + لینک فونت
با `display=swap` در هر ۱۱ صفحه.

## 🟡 فیکس‌ها و بهینه‌سازی‌های بک‌اند (بدون تغییر منطق)

| مورد | توضیح |
|---|---|
| secret کوکی hard-code بود | `COOKIE_SECRET` از env خوانده می‌شود (پیش‌فرض = مقدار قبلی، رفتار عوض نمی‌کند) |
| sessionهای منقضی هیچ‌وقت پاک نمی‌شدند | cleanup ساعتی fire-and-forget در createSession |
| `GET /api/cart` در هر درخواست UPSERT می‌نوشت | مسیر داغ (badge همه‌ی صفحات) → حالا read-first؛ یک write حذف شد |
| `/api/albums` یک کوئری اضافه داشت | count اضافی GROUP BY حذف شد (از داده‌ی خوانده‌شده محاسبه می‌شود) |
| استاتیک‌ها `max-age=0` بودند | Cache-Control per-type: عکس‌ها ۱ روز، css/js ۱ ساعت، /media هفته + immutable، HTML مثل قبل revalidate |

## ✅ راستی‌آزمایی زنده (npm start + curl)

- ۳۴/۳۴ تست (۳ رگرسیون جدید: users/me، جزئیات سفارش، آپلود آواتار)
- آپلود آواتار و آپلود ادمین با multipart واقعی → OK + هدر immutable
- Cache-Control همه‌ی نوع فایل‌ها + gzip (index: 9.4KB → 3KB) + هدرهای helmet
- کوکی: HttpOnly + SameSite=Lax + Expires=7d ✓
- کل مسیرها ۲۰۰: عمومی/کاربر/ادمین + هر ۱۱ صفحه
- سرچ فارسی با URL-encode مرورگر → 200 (بدون encode، خطای ۴۰۰ طبیعی HTTP است)
- `node --check` روی همه‌ی فایل‌های JS فرانت و سرور ✓

---

# 🚀 چک‌لیست دیپلوی — چی کمه؟ (فقط فهرست؛ طبق خواسته چیزی اضافه نشد)

**ضروری:**
1. **Reverse proxy + HTTPS** (nginx/caddy + Let's Encrypt) → بدون HTTPS، کوکی `secure`
   (که در production خودکار فعال است) یعنی **لاگین کار نمی‌کند**. `trustProxy` از قبل روشن است.
2. **Process manager** — systemd unit یا pm2؛ `npm start` خالی با crash/ریبوت می‌میرد.
3. **`.env` production** روی سرور: `NODE_ENV=production`، `DATABASE_URL` واقعی،
   `COOKIE_SECRET` تصادفی طولانی، `APP_URL` با دامنه واقعی، `ADMIN_EMAIL/PASSWORD` جدید.
4. **PostgreSQL سرور** + یوزر DB قوی + `npm run migrate && npm run seed && npm run create-admin`
   (هر سه idempotent هستند).
5. **بکاپ DB** (pg_dump دوره‌ای) + **پایداری `server/uploads/`** روی دیسک دائم (در git نیست، عمداً).
6. **`npm ci --omit=dev`** روی سرور (lockfile هست — از `npm install` استفاده نکن).

**پیشنهادی:**
7. مانیتورینگ `/api/health` (آماده است — فقط وصلش کن).
8. لاگ: stdout → journald/log shipper + rotate.
9. CI (GitHub Actions با سرویس postgres) — نیست.
10. Dockerfile / docker-compose — نیست (اختیاری).
11. robots.txt — نیست (جزئی).
12. CSP فعلاً خاموش است (inline scriptها زیادند) — بعداً با nonce سفت‌کاری شود.
13. `README.md` در ریشه‌ی ریپو — نیست (AUDIT و REVIEW و `/api/docs` موجودند).

---

# دور اول — باگ‌هایی که فیکس شدند

## 🔴 باگ‌های بحرانی (سایت عملاً بالا نمی‌آمد)

### ۱. ترتیب لود اسکریپت‌ها — همه‌ی صفحه‌ها کرش می‌کردند
`api.js` همیشه **آخرِ** لیست `<script>`ها بود، ولی فایل‌های صفحه (`cart.js`, `orders.js`,
`profile.js`, `account.js`, `shop.js`, `product.js`, `albums.js`, `wishlist.js`,
`edit-profile.js`, `home.js`) در سطح top-level صدا می‌زدند: `API.me()`, `API.get(...)`,
`var fmt = window.fmtNum` → چون اسکریپت‌های کلاسیک به‌ترتیب اجرا می‌شوند، `API`
هنوز تعریف نشده بود → **ReferenceError و مرگ کل IIFE** → هیچ صفحه‌ای داده رندر نمی‌کرد.

- `nav.js` هم guard داشت (`if (window.API && ...)`) → کرش نمی‌کرد ولی **هرگز** وضعیت
  ورود را نشان نمی‌داد (همیشه «ورود/ثبت‌نام»).
- `contact.js` چون API فقط داخل submit handler صدا می‌شد سالم بود.

**فیکس:** در هر ۱۱ صفحه ترتیب به `api.js → toast.js → nav.js → fx.js → page.js` تغییر کرد.

## 🔴 باگ‌های بک‌اند

### ۲. `GET /api/users/me` → خطای ۵۰۰
`users.service.js` خط ۶۳: `coupons.rows.map(...)` — ولی `coupons` از قبل خودِ `rows` بود
(از destructuring خط ۴۱) → `undefined.map` → TypeError.
پروفایل بی‌صدا آمار و کوپن‌ها را از دست می‌داد (catch خالی). **فیکس شد** + تست رگرسیون.

### ۳. تاریخچه‌ی سفارش snake_case بود
`GET /api/orders/:id` آرایه‌ی history را خام از DB برمی‌گرداند:
`{from_status, to_status, actor_name, note, created_at}` — ولی `orders.js`
`{fromStatus, toStatus, actor, note, at}` می‌خواند → تاریخچه سفارش به‌شکل
«undefined → undefined» رندر می‌شد. **فیکس:** نگاشت camelCase در سرویس (مثل بقیه‌ی API).

### ۴. آیتم‌های سفارش `image` نداشتند
جدول `order_items` snapshot عکس ندارد؛ `orders.js` هم `it.image` را نشان می‌داد
(→ هیچ عکسی در جزئیات سفارش نبود). **فیکس:** `LEFT JOIN products` در کوئری جزئیات
و افزودن `image` به mapItems. (اگر محصول حذف شود → null → فرانت guard دارد.)

## 🟡 باگ‌های فرانت

### ۵. ناسازگاری شکل ویش‌لیست (قرارداد API)
بک‌اند آیتم‌های ویش‌لیست را **flat** برمی‌گرداند (`{id, name, ...}`) ولی
`shop.js` و `product.js` `x.product.id` می‌خواندند → TypeError داخل then → (چون
rejection handler داشتند) بی‌صدا: **قلب‌های ویش‌لیست هیچ‌وقت فعال نشان داده نمی‌شدند**
روی فروشگاه و صفحه‌ی محصول. **فیکس:** `x.id`.

### ۶. فرم تماس: آیدی‌های خطا وجود نداشتند
HTML داشت `eName/eEmail/eMsg`، JS روی `err-name/err-email/err-msg` می‌نوشت
(function محافظت‌شده → بدون کرش) ولی **پیام‌های اعتبارسنجی هرگز نمایش داده نمی‌شدند**.
**فیکس:** آیدی‌های HTML به `err-*` تغییر کرد. (باقی‌مانده‌ی باگ شناخته‌شده‌ی AUDIT.md §7)

### ۷. `shop.html` دکمه‌ی «بیشتر ببین» نداشت
`shop.js` به `loadMoreBtn` گوش می‌داد ولی چنین المانی در صفحه نبود → صفحه‌بندی
مرده بود (با ۴ محصول معلوم نمی‌شد؛ با رشد کاتالوگ می‌شکست).
**فیکس:** دکمه + wrapper اضافه شد؛ JS حالا wrapper را toggle می‌کند.

### ۸. `profile.html` المان `couponHint` نداشت
`profile.js` «N کد تخفیف فعال 🎟️» را روی `#couponHint` می‌نوشت — المان وجود نداشت.
**فیکس:** کارت «کدهای تخفیف» به dash-grid پروفایل اضافه شد.

### ۹. toggleَ CMS برای welcome انیمیشن مرده بود
`home.js` نتیجه‌ی `welcome_albums.enabled === false` را می‌گرفت و هیچ کاری نمی‌کرد
(فقط return). **فیکس:** اگه ادمین خاموشش کرده باشد → پرتال بلافاصله حذف می‌شود.

## ✅ چیزهایی که تست شد و سالم بود

- کل مسیر خرید: register → login → add to cart → claim coupon → quote (تخفیف ۲۰٪) →
  place order (شماره سفارش `OR-1405-000001`) → orders list → order detail
- wishlist add/list/remove، reviews (GET/POST با moderation)، Q&A، contact، albums،
  content CMS، health، admin dashboard (با session ادمین)
- قرارداد data ها: products (specs/gallery/related/colors)، albums (tracks) — منطبق
- ۳۳/۳۳ تست سرور پاس (۳۱ قبلی + ۲ رگرسیون جدید: `users-orders.test.js`)
- امنیت: deny-list فایل‌های حساس در static (`server/`, `.env`, `AUDIT.md`, ...) کار می‌کند

## 📝 پیشنهادهای بعدی (فیکس نشده — تصمیم با تو)

1. **پنل ادمین**: بک‌اند کامل است (dashboard/products/albums/orders/users/coupons/
   messages/content/moderation/upload) ولی هیچ UIای ندارد — بزرگ‌ترین قدم بعدی.
2. **درگاه پرداخت**: checkout فعلاً «پرداخت در تحویل/دستی» است؛ زرین‌پال/آیدی‌پی منطقی است.
3. **badge سبد در همه‌ی صفحات**: الان فقط shop.html شمارنده‌ی سبد/ویش‌لیست دارد.
4. **Deploy**: Dockerfile + docker-compose (postgres + app) + reverse proxy.
5. **CI** (GitHub Actions): اجرای `npm test` روی هر push — دیتابیس postgres به‌عنوان سرویس.

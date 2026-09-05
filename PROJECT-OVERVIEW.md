# مستند کامل پروژه — Omid Stare (OMID RASTAR ★ PSYCH)

> فروشگاه اینترنتی و ویترین دیجیتال یک گروه موسیقی راک سایکدلیک/پروگرسیو فارسی‌زبان.
> فروش مرچ (تیشرت، هودی، وینیل، اکسسوری) + معرفی آلبوم‌ها با tracklist و پخش آنلاین.

**تهیه‌شده:** ۱۴ شهریور ۱۴۰۴ · **شاخه:** `arena/01a06651-omid-stare` · **آخرین کامیت:** `ed0ddab`

---

## فهرست

۱. [نگاه کلی در یک نگاه](#۱-نگاه-کلی-در-یک-نگاه)
۲. [معماری](#۲-معماری)
۳. [پشتهٔ فناوری](#۳-پشتهٔ-فناوری)
۴. [ساختار پوشه‌ها](#۴-ساختار-پوشهها)
۵. [مدل داده](#۵-مدل-داده-۱۹-جدول)
۶. [API](#۶-api--۷۳-endpoint)
۷. [صفحات فرانت‌اند](#۷-صفحات-فرانتاند-۱۳-صفحه)
۸. [قابلیت‌ها به تفکیک حوزه](#۸-قابلیتها-به-تفکیک-حوزه)
۹. [امنیت](#۹-امنیت)
۱۰. [زبان فارسی و بومی‌سازی](#۱۰-زبان-فارسی-و-بومیسازی)
۱۱. [طراحی و هویت بصری](#۱۱-طراحی-و-هویت-بصری)
۱۲. [داده‌های نمونه](#۱۲-دادههای-نمونه-seed)
۱۳. [راه‌اندازی](#۱۳-راهاندازی)
۱۴. [تست](#۱۴-تست)
۱۵. [نقاط قوت و ضعف](#۱۵-ارزیابی-فنی)

---

## ۱. نگاه کلی در یک نگاه

| مورد | مقدار |
|---|---|
| نوع | فروشگاه اینترنتی تک‌مستأجره + ویترین موسیقی |
| زبان محتوا | فارسی (RTL کامل) |
| معماری | مونولیت ماژولار |
| بک‌اند | Node.js 20+ / Fastify 5 / PostgreSQL 16 |
| فرانت‌اند | HTML/CSS/JS خالص — **بدون فریم‌ورک، بدون build step** |
| تعداد فایل | ۱۳۴ (بدون `node_modules`) |
| خطوط کد | ~۱۲٬۱۵۰ خط |
| جدول دیتابیس | ۱۹ |
| endpoint API | ۷۳ |
| صفحهٔ HTML | ۱۳ |
| تست خودکار | ۳۴ تست در ۶ فایل |
| وابستگی تولیدی | ۱۲ پکیج |

**تفکیک خطوط کد:**

```
سرور (src/)     4,841 خط  ████████████████████  40%
فرانت (js/)     2,746 خط  ███████████           23%
CSS             1,912 خط  ████████              16%
HTML            1,489 خط  ██████                12%
تست               874 خط  ████                   7%
migrations        284 خط  █                      2%
```

---

## ۲. معماری

### مونولیت ماژولار

یک فرآیند Node، یک دیتابیس. اما داخل `server/src/modules/` هر حوزهٔ کسب‌وکار پوشهٔ مستقل خودش را دارد با الگوی ثابت دو فایلی:

```
modules/<domain>/
├── <domain>.routes.js    ← تعریف مسیر، اعتبارسنجی ورودی (zod)، فراخوانی سرویس
└── <domain>.service.js   ← منطق کسب‌وکار + کوئری SQL
```

این جداسازی یعنی routes هیچ SQL نمی‌نویسد و service هیچ چیزی از HTTP نمی‌داند. مزیت عملی‌اش این است که سرویس‌ها از داخل تست‌ها مستقیم قابل فراخوانی‌اند.

**۱۳ ماژول:** `auth` · `users` · `products` · `albums` · `cart` · `orders` · `wishlist` · `coupons` · `contact` · `content` · `reviews` · `questions` · `admin`

همه در `api.routes.js` زیر پیشوند `/api` ثبت می‌شوند؛ ماژول `admin` پیشوند اضافی `/admin` می‌گیرد.

### سرو کردن یکپارچه

نکتهٔ معماری جالب اینجاست: **همان فرآیند Fastify هم API را سرو می‌کند هم فایل‌های استاتیک فرانت‌اند را.** هیچ nginx، هیچ سرور جداگانه، هیچ CORS. فرانت‌اند از `FRONTEND_DIR` (پیش‌فرض ریشهٔ مخزن) با `@fastify/static` سرو می‌شود. یعنی کل سایت با یک دستور `npm start` بالا می‌آید.

### لایهٔ دسترسی به داده

نکتهٔ عجیب و قابل توجه: `drizzle-orm` در وابستگی‌هاست و `db/schema.js` کامل تعریف شده — **ولی کوئری‌ها با `pg` خام نوشته شده‌اند.** schema عملاً نقش «مستند زندهٔ ساختار جدول‌ها» را بازی می‌کند نه query builder. مهاجرت‌ها هم SQL دستی در `migrations/*.sql` هستند با یک runner ساده.

این انتخاب بد نیست (کنترل کامل روی SQL، بدون سربار ORM) ولی باید بدانی: **schema.js و migrations می‌توانند از هم واگرا شوند** چون هیچ چیزی همگامی‌شان را تضمین نمی‌کند.

```
┌─────────────────────────────────────────┐
│  مرورگر — HTML/CSS/JS خالص، بدون build  │
└───────────────┬─────────────────────────┘
                │ fetch (کوکی sid)
┌───────────────▼─────────────────────────┐
│           Fastify 5                     │
│  helmet · rate-limit · cookie ·         │
│  compress · multipart · static · csrf   │
├─────────────────────────────────────────┤
│  routes (zod)  →  services (منطق)       │
├─────────────────────────────────────────┤
│         pg pool (SQL پارامتری)          │
└───────────────┬─────────────────────────┘
                │
        ┌───────▼────────┐
        │  PostgreSQL 16 │
        └────────────────┘
```

---

## ۳. پشتهٔ فناوری

### وابستگی‌های تولیدی (۱۲)

| پکیج | نسخه | نقش |
|---|---|---|
| `fastify` | ^5.3.2 | وب‌فریم‌ورک |
| `pg` | ^8.16.3 | درایور PostgreSQL |
| `drizzle-orm` | ^0.44.2 | تعریف schema (کوئری‌ها خام‌اند) |
| `zod` | ^3.25.67 | اعتبارسنجی ورودی |
| `argon2` | ^0.44.0 | هش رمز عبور |
| `@fastify/helmet` | ^13.0.1 | هدرهای امنیتی |
| `@fastify/rate-limit` | ^10.2.2 | محدودیت نرخ |
| `@fastify/cookie` | ^11.0.2 | کوکی سشن |
| `@fastify/static` | ^8.1.1 | سرو فرانت‌اند |
| `@fastify/multipart` | ^9.0.3 | آپلود فایل |
| `@fastify/compress` | ^8.3.1 | فشرده‌سازی پاسخ |
| `dotenv` | ^16.5.0 | متغیرهای محیطی |

### توسعه (۲)
`embedded-postgres` — PostgreSQL بدون نیاز به نصب یا Docker · `pino-pretty` — لاگ خوانا

### فرانت‌اند: صفر وابستگی

هیچ React، Vue، jQuery، Bootstrap یا Tailwind. هیچ webpack یا vite. فایل‌ها مستقیم در مرورگر اجرا می‌شوند. تنها منبع خارجی، فونت Vazirmatn از Google Fonts است.

---

## ۴. ساختار پوشه‌ها

```
Omid-Stare/
├── *.html (۱۳)              صفحات — ریشهٔ مخزن، مستقیم سرو می‌شوند
├── css/ (۱۳ فایل)           main.css بقیه را @import می‌کند
├── js/ (۱۸ فایل)            یک فایل به‌ازای هر صفحه + ۴ ماژول مشترک
├── images/ (۱۶ فایل)        کاور آلبوم، عکس محصول، بک‌گراند
├── docker-compose.yml       فقط PostgreSQL (اپ با npm اجرا می‌شود)
├── README.md                راهنمای نصب و استفاده
├── AUDIT.md / REVIEW.md     مستندات بازبینی موجود در مخزن
└── server/
    ├── src/
    │   ├── server.js        نقطهٔ ورود
    │   ├── app.js           ساخت اپ، ثبت پلاگین‌ها، error handler
    │   ├── config/index.js  همهٔ env در یک شیء + بررسی امنیتی راه‌اندازی
    │   ├── db/              client (pool) · schema · migrate
    │   ├── middlewares/     auth.js (requireAuth/requireAdmin) · csrf.js
    │   ├── modules/ (۱۳)    هر حوزه: routes + service
    │   ├── services/        notification.service.js
    │   └── utils/           respond · errors · pagination · jalali
    ├── migrations/ (۳)      SQL دستی
    ├── scripts/             migrate · seed · create-admin · db-embedded
    └── test/ (۶)            تست یکپارچه با node:test
```

### چهار ماژول مشترک فرانت

اینها در همهٔ صفحات لود می‌شوند و ستون فقرات فرانت‌اند هستند:

| فایل | خط | نقش |
|---|---|---|
| `api.js` | ۱۰۲ | `API.get/post/patch/del`، مدیریت خطا، `escHtml`، `fmtNum` |
| `nav.js` | ۵۵ | ناوبری مشترک، وضعیت ورود، شمارندهٔ سبد |
| `toast.js` | ۱۶ | پیام‌های شناور |
| `fx.js` | ۴۵ | افکت‌های بصری سایکدلیک |

`escHtml` در `api.js` مهم‌ترین تابع امنیتی فرانت است — همهٔ محتوای تولیدشده توسط کاربر قبل از رفتن به DOM از آن رد می‌شود.

---

## ۵. مدل داده (۱۹ جدول)

### احراز هویت
**`users`** — `id` · `name` · `email` · `password_hash` (Argon2id) · `avatar_url` · `role` (`customer`\|`admin`) · `is_active` · `last_login_at`
**`sessions`** — `token_hash` (فقط sha256، هرگز خود توکن) · `user_id` · `user_agent` · `ip` · `expires_at`

### کاتالوگ
**`products`** — `slug` (یکتا) · `name` · `name_en` · `price` · `compare_at_price` (قیمت قبل تخفیف) · `stock` · `category` · `badge` · `sort_order` · `image` + چهار ستون **jsonb**: `sizes` · `colors` · `gallery` · `specs` · `features`

استفاده از jsonb برای سایز/رنگ/گالری یعنی افزودن ویژگی جدید به محصول نیاز به migration ندارد.

**`albums`** — `title` · `title_fa` · `year` (شمسی) · `genre` · `cover_image` · `description` · `is_published` · `sort_order`
**`album_tracks`** — `album_id` · `track_number` · `title` · `duration` (ثانیه) · `audio_url` · `is_published`

### سبد و سفارش
**`carts`** — یک سبد ماندگار به‌ازای هر کاربر (`user_id` یکتا)
**`cart_items`** — `product_id` · `quantity` · `selected_size` · `selected_color`
**`orders`** — `order_number` (یکتا، `OR-1404-000123`) · `status` · `payment_status` · `subtotal` · `discount_amount` · `shipping_amount` · `total_amount` · `coupon_id` + اطلاعات تحویل (`customer_name`, `phone`, `email`, `address`, `city`, `postal_code`, `notes`)
**`order_items`** — **`product_name_snapshot`** و `unit_price` را کپی می‌کند
**`order_status_history`** — ردیابی کامل: `from_status` → `to_status` + `actor_id` + `actor_name` + `note`

> **نکتهٔ طراحی خوب:** `order_items` نام و قیمت را snapshot می‌کند. اگر بعداً قیمت محصول عوض شود یا حذف شود، فاکتور قدیمی دست‌نخورده می‌ماند. این اشتباهی است که خیلی فروشگاه‌ها مرتکب می‌شوند.

### تعامل کاربر
**`user_wishlist`** · **`reviews`** (`rating` ۱–۵ · `body` · `is_approved`) · **`product_questions`** (پرسش کاربر + پاسخ ادمین)

### کوپن (دو سطحی)
**`coupon_campaigns`** — `discount_type` (`percentage`\|`fixed`) · `discount_value` · `target_product_id` · `starts_at`/`expires_at` · `max_uses` · `redeemed_count`
**`coupons`** — کدهای منفرد زیر هر کمپین · **`code_hash`** (sha256، کد خام ذخیره نمی‌شود) · `code_last4` · `assigned_user_id` · `claimed_at` · `redeemed_at`

مدل «claim» جالب است: کاربر کد را وارد می‌کند و کد به حسابش **قفل** می‌شود، بعداً هنگام سفارش استفاده می‌کند.

### زیرساخت
**`contact_messages`** · **`site_content`** (CMS کلید-مقدار jsonb) · **`notifications`** · **`app_sequences`** (شمارندهٔ اتمیک شمارهٔ سفارش)

---

## ۶. API — ۷۳ endpoint

پاسخ‌ها قالب یکنواخت دارند:
```jsonc
{ "success": true,  "data": { ... } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "پیام فارسی" } }
```

### عمومی (بدون ورود)
```
GET  /api/health                          سلامت + وضعیت DB با latency
GET  /api/products                        فهرست + جستجو/فیلتر/مرتب‌سازی/صفحه‌بندی
GET  /api/products/:idOrSlug              یک محصول (id یا slug)
GET  /api/albums                          فهرست آلبوم + trackCount
GET  /api/albums/:id                      آلبوم + tracklist کامل
GET  /api/products/:productId/reviews     نظرات تأییدشده
GET  /api/products/:productId/questions   پرسش‌های پاسخ‌داده‌شده
GET  /api/content                         همهٔ محتوای CMS
GET  /api/content/:key                    یک کلید
POST /api/contact                         ارسال پیام تماس
GET  /api/docs · /api/docs.json           مستندات OpenAPI
```

### احراز هویت
```
POST /api/auth/register · /api/auth/login · /api/auth/logout
GET  /api/auth/me
```

### کاربر واردشده
```
GET   /api/users/me · PATCH /api/users/me
POST  /api/users/me/change-password
GET   /api/cart · POST /api/cart/items
PATCH /api/cart/items/:id · DELETE /api/cart/items/:id
GET   /api/cart/summary · POST /api/cart/quote   ← پیش‌محاسبهٔ کوپن قبل ثبت
GET   /api/orders · POST /api/orders · GET /api/orders/:id
GET   /api/wishlist · POST /api/wishlist/:productId · DELETE ...
POST  /api/coupons/claim · GET /api/coupons/my
POST  /api/reviews · POST /api/questions
```

### ادمین (`/api/admin/*`)
CRUD کامل روی products · albums (+ tracks + `/move` برای ترتیب) · users · orders (+ `/status`) · reviews · questions · content · coupons/campaigns (+ تولید انبوه کد) · messages · notifications · dashboard (آمار)

---

## ۷. صفحات فرانت‌اند (۱۳ صفحه)

| صفحه | نقش |
|---|---|
| `index.html` | لندینگ — محتوا از CMS، محصولات منتخب |
| `shop.html` | فروشگاه با جستجو، فیلتر دسته، مرتب‌سازی، صفحه‌بندی |
| `product.html` | جزئیات محصول (`?slug=`) — گالری، سایز/رنگ، نظرات، پرسش‌ها |
| `albums.html` | شبکهٔ آلبوم‌ها + نوار خرید افقی زیر هر کارت |
| `album.html` | **جزئیات آلبوم** (`?id=`) — کاور چرخان، tracklist، پخش صوت |
| `cart.html` | سبد + اعمال کوپن + ثبت سفارش |
| `orders.html` | تاریخچهٔ سفارش‌ها |
| `wishlist.html` | علاقه‌مندی‌ها |
| `profile.html` / `edit-profile.html` | پروفایل و ویرایش + آواتار |
| `account.html` | ورود/ثبت‌نام |
| `contact.html` | فرم تماس |
| `admin.html` | **پنل ادمین کامل** — ۶۹۵ خط JS، تنها صفحهٔ بدون `nav.js` |

هر صفحه دقیقاً یک فایل JS اختصاصی دارد. الگو ساده و قابل پیش‌بینی است: `shop.html` → `js/shop.js`.

---

## ۸. قابلیت‌ها به تفکیک حوزه

### فروشگاه
- کاتالوگ با جستجوی متنی، فیلتر دسته، مرتب‌سازی، صفحه‌بندی
- انتخاب سایز و رنگ، گالری تصاویر، مشخصات فنی، ویژگی‌ها
- `compare_at_price` برای نمایش قیمت خط‌خورده
- برچسب (badge) روی محصول
- مدیریت موجودی — سفارش بیش از موجودی رد می‌شود

### سبد و پرداخت
- سبد **ماندگار سمت سرور** (نه localStorage) — بین دستگاه‌ها همگام
- `POST /api/cart/quote` قبل از ثبت، مبلغ نهایی با کوپن را برمی‌گرداند
- **قیمت‌گذاری کاملاً سمت سرور** — قیمت ارسالی کلاینت نادیده گرفته می‌شود
- ثبت سفارش تراکنشی: کسر موجودی + مصرف کوپن + خالی کردن سبد، همه اتمیک
- شمارهٔ سفارش با سال شمسی و شمارندهٔ اتمیک self-healing

### چرخهٔ عمر سفارش
ماشین حالت با گذارهای **مجاز صریح** (نه هر تغییری ممکن است):
```
pending ──→ confirmed ──→ processing ──→ shipped ──→ delivered
   │            │              │
   └────────────┴──────────────┴──→ cancelled

delivered / cancelled = حالت پایانی (بدون خروج)
```
وضعیت پرداخت جدا: `unpaid` · `pending` · `paid` · `failed` · `refunded`
هر تغییر در `order_status_history` با نام عامل ثبت می‌شود.

> **درگاه پرداخت واقعی وصل نیست.** `payment_status` دستی مدیریت می‌شود — این پروژه آمادهٔ اتصال به زرین‌پال/IDPay است ولی هنوز وصل نشده.

### موسیقی
- آلبوم با tracklist، مدت هر ترک، مدت کل
- پخش صوت درون‌صفحه‌ای وقتی `audio_url` موجود باشد
- کاور چرخان (افکت وینیل) در صفحهٔ جزئیات
- اتصال آلبوم به محصول مرتبط (مثلاً وینیل آن آلبوم) — اگر محصولی نباشد پیام «به‌زودی توی فروشگاه 🌀»

### تعامل
- نظر با امتیاز ۱–۵ — **فقط خریداران واقعی** (بررسی وجود سفارش غیرلغوشده)
- نظرات نیاز به تأیید ادمین دارند (`is_approved = false` پیش‌فرض)
- پرسش و پاسخ روی محصول
- علاقه‌مندی

### کوپن
- کمپین + کدهای منفرد تولیدشده زیر آن
- درصدی یا مبلغ ثابت، قابل محدود کردن به یک محصول
- claim اتمیک: `UPDATE ... WHERE assigned_user_id IS NULL` — دو درخواست همزمان، یکی می‌بازد
- کد خام هرگز ذخیره نمی‌شود، فقط sha256 + چهار رقم آخر

### پنل ادمین
داشبورد آمار · CRUD محصول و آلبوم (+ جابه‌جایی ترتیب) · مدیریت کاربر · مدیریت سفارش با تغییر وضعیت · تعدیل نظر و پرسش · ویرایش محتوای CMS · ساخت کمپین و تولید انبوه کد · صندوق پیام تماس · اعلان‌ها

### CMS سبک
جدول `site_content` کلید-مقدار با jsonb. کلیدهای فعال:
`hero` · `manifest` · `contact_info` · `socials` · `featured` · `welcome_albums` · `footer_note`

یعنی ادمین می‌تواند متن‌های صفحهٔ اصلی را بدون دیپلوی عوض کند.

---

## ۹. امنیت

> ممیزی کامل در `SECURITY-AUDIT.md`. اینجا فقط خلاصه.

**احراز هویت:** توکن سشن مات ۲۵۶ بیتی · فقط sha256 در دیتابیس · Argon2id برای رمز · verify با hash ساختگی برای کاربر ناموجود (ضد نشت زمانی) · پاکسازی ساعتی سشن منقضی · کوکی HttpOnly + SameSite (Strict در production) + Secure

**مجوزدهی:** `requireAuth` / `requireAdmin` · whitelist با zod روی فیلدهای حساس (`role`, `is_active`) · جلوگیری از تنزل خودِ ادمین

**اعتبارسنجی:** zod روی همهٔ ورودی‌ها · SQL کاملاً پارامتری · قیمت سمت سرور · محدودیت حجم بدنه ۱MB · whitelist نوع MIME برای آپلود + نام فایل UUID تصادفی

**هدرها:** helmet — HSTS یک‌ساله، nosniff، X-Frame-Options، Referrer-Policy. **CSP خاموش** (به‌خاطر inlineها).

**محدودیت نرخ:** سراسری ۳۰۰ / ۱۵ دقیقه · احراز هویت ۱۰ · کوپن ۸ · تماس ۶ · سفارش ۱۰

**اصلاحات این ممیزی (کامیت `ed0ddab`):**
۱. rate limit به‌جای ۵۰۰ حالا ۴۲۹ + `retryAfterSec` برمی‌گرداند
۲. `COOKIE_SECRET` پیش‌فرض هاردکد حذف شد + بررسی fail-fast راه‌اندازی در production
۳. `trustProxy` شرطی شد (پیش‌فرض امن) — قبلاً `X-Forwarded-For` جعلی محدودیت نرخ را دور می‌زد
۴. میان‌افزار CSRF مبتنی بر بررسی Origin اضافه شد

---

## ۱۰. زبان فارسی و بومی‌سازی

بومی‌سازی اینجا سطحی نیست — در معماری تنیده شده:

- **RTL کامل** در همهٔ صفحات
- **همهٔ پیام‌های خطای API فارسی‌اند** — حتی خطاهای داخلی سرور
- **تقویم جلالی:** `utils/jalali.js` تبدیل میلادی→شمسی بدون هیچ وابستگی. شمارهٔ سفارش سال شمسی دارد (`OR-1404-000123`)
- سال انتشار آلبوم‌ها شمسی است (۱۳۹۸ تا ۱۴۰۴)
- واحد پول **تومان**، به‌صورت `integer` (بدون اعشار — درست برای تومان)
- اعداد با جداکنندهٔ هزارگان فارسی (`fmtNum`)
- فونت **Vazirmatn** برای فارسی + **Space Grotesk** برای لاتین
- کامنت‌های کد هم فارسی‌اند

---

## ۱۱. طراحی و هویت بصری

تم «سایکدلیک تاریک» با پالت نئون:

| متغیر | کد | نقش |
|---|---|---|
| `--void` | `#08070f` | پس‌زمینهٔ اصلی |
| `--void-2` | `#0f0c1e` | پس‌زمینهٔ ثانویه |
| `--paper` | `#f7f2e8` | متن روشن |
| `--magenta` | `#ff2d95` | تأکید اول |
| `--purple` | `#7a2cff` | تأکید دوم |
| `--cyan` | `#00ffd1` | تأکید سوم |
| `--lime` | `#d9ff00` | هایلایت |
| `--orange` / `--amber` | `#ff6a00` / `#ffb700` | گرم |

`theme-psych.css` (۲۱۷ خط) و `fx.js` افکت‌های بصری را می‌سازند. `welcome-pilot.css` یک تجربهٔ ورود اولیه دارد. طراحی ریسپانسیو با breakpointهای ۵۲۰px / ۸۰۰px.

---

## ۱۲. داده‌های نمونه (seed)

### محصولات
| نام | قیمت | موجودی | دسته |
|---|---|---|---|
| تیشرت Liquid Void | ۹۸۰٬۰۰۰ | ۱۲ | پوشاک |
| هودی Portal | ۲٬۱۰۰٬۰۰۰ | ۵ | پوشاک |
| وینیل Prism Dust — نئون | ۳٬۶۰۰٬۰۰۰ | ۳ | وینیل |
| ست پیک‌های پرتالی | ۳۲۰٬۰۰۰ | ۲۸ | اکسسوری |

### آلبوم‌ها
| عنوان | فارسی | سال | ژانر | ترک |
|---|---|---|---|---|
| Liquid Void | خلأ مایع | ۱۴۰۴ | PROG PSYCH | ۴ |
| Neon Mirage | سراب نئون | ۱۴۰۲ | ACID ROCK | ۳ |
| Acid Garden | باغ اسیدی | ۱۴۰۰ | PSYCH | ۳ |
| Prism Dust | غبار منشور | ۱۳۹۸ | SPACE ROCK | ۳ |

از این چهار آلبوم فقط **Prism Dust** محصول متناظر در فروشگاه دارد (وینیلش). بقیه در صفحهٔ آلبوم پیام «به‌زودی توی فروشگاه 🌀» نشان می‌دهند.

---

## ۱۳. راه‌اندازی

### سریع‌ترین راه — بدون Docker
```bash
cd server
npm install
npm run db:embedded      # PostgreSQL جاسازی‌شده + migrate + seed (سرویس ماندگار)
npm start                # http://localhost:3000
```

### با Docker
```bash
docker compose up -d     # فقط PostgreSQL
cd server && npm install
npm run migrate && npm run seed
npm run dev              # با --watch
```

### اسکریپت‌ها
| دستور | کار |
|---|---|
| `npm start` / `npm run dev` | اجرا (dev با watch) |
| `npm run migrate` / `migrate:status` | اجرای مهاجرت / وضعیت |
| `npm run seed` | داده نمونه |
| `npm run setup` | migrate + seed |
| `npm run create-admin` | ساخت ادمین |
| `npm run db:embedded` | PG جاسازی‌شده |
| `npm test` | تست‌ها |

### متغیرهای کلیدی
`DATABASE_URL` · `COOKIE_SECRET` (اجباری در production) · `SESSION_TTL_DAYS` (۷) · `ADMIN_EMAIL`/`ADMIN_PASSWORD` · `TRUST_PROXY` (اگر پشت پراکسی) · `CSRF_ALLOWED_ORIGINS` · `RL_*` · `MAX_AVATAR_BYTES` · `SHIPPING_AMOUNT`

---

## ۱۴. تست

۳۴ تست یکپارچه با `node:test` داخلی (بدون jest/mocha) روی دیتابیس تست جدا:

| فایل | تست | پوشش |
|---|---|---|
| `auth.test.js` | ۶ | ثبت‌نام، ورود، سشن، خروج |
| `catalog.test.js` | ۶ | محصول، آلبوم، جستجو، فیلتر |
| `cart-order.test.js` | ۶ | سبد، ثبت سفارش، موجودی |
| `coupons.test.js` | ۶ | claim، اعمال تخفیف، انقضا |
| `admin-moderation.test.js` | ۷ | تأیید نظر، پاسخ پرسش |
| `users-orders.test.js` | ۳ | پروفایل، تاریخچه |

---

## ۱۵. ارزیابی فنی

### نقاط قوت

**۱. تصمیمات امنیتی درست از ابتدا.** Argon2id، توکن مات با sha256، snapshot قیمت، محاسبهٔ سمت سرور، claim اتمیک کوپن. اینها الگوهایی هستند که معمولاً بعد از یک حادثه اضافه می‌شوند، نه از روز اول.

**۲. سادگی عامدانه.** فرانت‌اند بدون build step یعنی هر کسی می‌تواند یک فایل را باز کند و بفهمد چه خبر است. برای پروژه‌ای در این ابعاد، نبود React یک مزیت است نه کمبود.

**۳. یکپارچگی داده.** `order_items` نام و قیمت را snapshot می‌کند، ماشین حالت سفارش گذارهای مجاز را صریح تعریف کرده، `order_status_history` ردیابی کامل دارد، شمارندهٔ شمارهٔ سفارش اتمیک و self-healing است.

**۴. بومی‌سازی عمیق.** تقویم جلالی دست‌نویس، پیام‌های خطای فارسی، تومان به‌صورت integer.

**۵. تجربهٔ توسعه.** `npm run db:embedded` بدون Docker یا نصب PostgreSQL کار می‌کند — مانع ورود تقریباً صفر.

### نقاط ضعف و بدهی فنی

**۱. درگاه پرداخت وصل نیست.** `payment_status` وجود دارد ولی دستی است. برای فروش واقعی باید زرین‌پال یا مشابهش وصل شود.

**۲. `drizzle-orm` بلااستفاده.** یک وابستگی تولیدی که فقط برای تعریف schema به کار می‌رود در حالی که کوئری‌ها خام‌اند. `schema.js` و `migrations/` می‌توانند بی‌سروصدا از هم واگرا شوند. یا drizzle را واقعاً برای کوئری‌ها به کار بگیر، یا حذفش کن و schema را به کامنت تبدیل کن.

**۳. نبودِ CSP.** به‌خاطر اسکریپت و استایل inline در HTMLها. تا وقتی inlineها منتقل نشوند، CSP سخت‌گیرانه ممکن نیست.

**۴. تکرار در فرانت.** هر صفحه منطق fetch و رندر خودش را دارد. `album-shared.js` نشان می‌دهد که الگوی استخراج مشترکات شروع شده ولی به بقیهٔ صفحات نرسیده.

**۵. تطبیق آلبوم به محصول شکننده است.** در `album-shared.js` تابع `matchProduct` بر اساس تطبیق زیررشتهٔ نام کار می‌کند. یک کلید خارجی `albums.product_id` تمیزتر و قابل‌اعتمادتر بود.

**۶. جستجو ساده است.** `ILIKE` روی نام. برای این ابعاد کافی است ولی با رشد کاتالوگ نیاز به full-text search PostgreSQL خواهد شد.

**۷. آپلود روی فایل‌سیستم محلی.** `UPLOAD_DIR` محلی است — مقیاس افقی یا دیپلوی روی پلتفرم‌های stateless (Heroku، Cloud Run) نیاز به S3 دارد.

### وضعیت بلوغ

پروژه در وضعیت **«آمادهٔ نمایش، نزدیک به آمادهٔ تولید»** است. معماری تمیز، امنیت جدی، مدل داده سنجیده. سه کار تا تولید واقعی فاصله دارد:

۱. اتصال درگاه پرداخت
۲. تعیین تکلیف drizzle
۳. جابه‌جایی inlineها و فعال کردن CSP

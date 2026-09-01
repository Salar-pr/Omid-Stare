# REVIEW — بازبینی کامل (۰۱ سپتامبر ۲۰۲۶ / ۱۰ شهریور ۱۴۰۵)

نتیجه‌ی بازبینی کامل فرانت + بک‌اند + تست E2E واقعی (ثبت‌نام → سبد → کوپن → سفارش).
همه‌ی موارد پایین **در همین کامیت‌ها فیکس شده‌اند** — جز بخش «پیشنهادهای بعدی».

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

<div align="center">


# 🌀 OMID RASTAR

### Omid Stare — سایت سایکدلیک پراگرسیو + فروشگاه + کاتالوگ آلبوم‌ها + پنل ادمین

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-3c873a?logo=node.js&logoColor=white)](https://nodejs.org)
[![Fastify](https://img.shields.io/badge/Fastify-5-56b4d9)](https://fastify.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169a1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-36c2fe)](https://orm.drizzle.team)
[![RTL / فارسی](https://img.shields.io/badge/RTL-فارسی-e91e63)]()
[![Tests](https://img.shields.io/badge/tests-34%20E2E-green)]()

> این بار نه فولاد و نه خون — **سفره**.
>
> ◍ TAME IMPALA × PINK FLOYD × TOOL → EASTERN RIFF ◍
>
> **به ووید خوش اومدی.** 🖤 — همه‌چیز در یک ریپو: از پورتال سایکدلیک تا ثبت سفارش.

</div>

---

## 🚀 شروع سریع

پیش‌نیازها: **Node 20+** و **PostgreSQL 14+**

```bash
git clone https://github.com/Salar-pr/Omid-Stare.git
cd Omid-Stare

# ۱) دیتابیس
createdb omid_stare

# ۲) متغیرهای محیطی
cp .env.example .env      # مقادیر را پر کن (ADMIN_EMAIL / ADMIN_PASSWORD را فراموش نکن)

# ۳) نصب، مایگریشن، seed
cd server
npm install
npm run migrate
npm run seed

# ۴) پرواز 🛫
npm run dev
```

| چی کجا | لینک |
|---|---|
| 🌐 سایت | `http://localhost:3000` |
| 📚 داک API | `http://localhost:3000/docs` (و `openapi.json` در `/docs.json`) |
| ❤️ Health | `http://localhost:3000/api/health` |

- **seed ایدامپوتنت است** — هر چند بار بخواهی بزن. ۴ محصول، ۴ آلبوم با ترک‌ها، reviewها، Q&A، محتوای سایت (hero/مانیفست/تماس)، یک کمپین کوپن نمونه و یوزر ادمین (از env) می‌سازد.
- فرانت‌اند را **همان سرور سرو می‌کند** — هاستینگ جدا لازم نیست.

## ✨ تو جعبه چه‌هاست

**🎨 فرانت‌اند — ۱۱ صفحه، فارسی، RTL، بدون هیچ framework**
- **Welcome Portal** — ورودی تریپی با حلقه‌های چرخان و لوگو، پیش از landing
- صفحه‌ی اصلی (مانیفستِ تریپ، دیسکوگرافی، مرچ) · کاتالوگ آلبوم‌ها · فروشگاه · صفحه‌ی محصول (گالری، مشخصات، reviewها، پرسش‌وپاسخ)
- سبد خرید (quote و summary) · سفارش‌ها و تاریخچه · ویس‌لیست
- فرم تماس · ورود/ثبت‌نام · پروفایل · ویرایش پروفایل (آپلود آواتار، تغییر رمز)

**💿 آلبوم‌ها** — ۴ آلبوم با لیست ترک‌ها + پلیر؛ «welcome track» صفحه‌ی آلبوم‌ها خودکار پخش می‌شود.

**🛒 فروشگاه** — سبد، هزینه‌ی ارسال، **کوپن و کمپین تخفیف** (کدهای generated از پنل ادمین)، جریان وضعیت سفارش با history.

**👤 کاربر** — ثبت‌نام/لاگین با session کوکیِ امضاشده، TTL قابل‌تنظیم، ویس‌لیست، پروفایل و آواتار.

**🛠️ پنل ادمین** — داشبورد · CRUD محصول · مدیریت آلبوم و ترک (با re-order) · سفارش‌ها (تغییر وضعیت) · کمپین‌های کوپن (generate انبوه کد) · پیام‌های تماس · **نوتیفیکیشن داخل سایت** · آپلود مدیا · لیست یوزرها.

**⭐ Review + Q&A** — یوزرها نظر و سؤال می‌نویسند؛ ادمین edit/حذف می‌کند (moderation).

**📡 نوتیفیکیشن** — سرویس کانال‌محور: رویدادهایی مثل `order_created` به کانال‌های `log` و `admin` می‌روند؛ کانال‌های Telegram/Email/SMS **بدون لمس order service** اضافه می‌شوند.

## 🧱 استک

| لایه | تکنولوژی |
|---|---|
| فرانت | Vanilla HTML/CSS/JS (بدون build، بدون framework) · فونت Vazirmatn + Space Grotesk · هویت Psychedelic/Dark/Neon |
| API | **Fastify 5** · اعتبارسنجی با **zod** |
| دیتابیس | **PostgreSQL** · **Drizzle ORM** · pool با `pg` |
| Auth | **argon2id** · کوکی session امضاشده (`sid`) |
| امنیت | helmet · gzip · `@fastify/rate-limit` · redact لاگ · denylist استاتیک |
| تست | **`node:test`** داخلی — ۳۴ تست، جریان واقعی E2E |

## 🏗️ معماری: modular monolith سبک‌وزن

هر قابلیت یک ماژول مستقل با `routes` + `service`؛ مشترک‌ها جدا:

```
server/src/
├── modules/
│   ├── auth/       # register / login / logout / me + session
│   ├── albums/     # کاتالوگ آلبوم‌ها + ترک‌ها
│   ├── products/   # محصولات + reviewها + Q&A
│   ├── cart/       # سبد + quote / summary
│   ├── coupons/    # کمپین‌ها + کدها
│   ├── orders/     # ثبت سفارش + وضعیت
│   ├── wishlist/
│   ├── users/      # پروفایل، آواتار، تغییر رمز
│   ├── contact/    # پیام‌های عمومی
│   ├── content/    # محتوای قابل‌ویرایش سایت (hero/مانیفست/…)
│   ├── admin/      # داشبورد، سفارش‌ها، مدیا، moderation
│   └── docs/       # داک API (docs.html + openapi.json)
├── services/notification.service.js   # کانال‌محور، قابل گسترش
├── middlewares/auth.js
├── db/                      # client + schema (Drizzle) + migrate
├── config/                  # env یک‌بار خوانده و validate می‌شود
└── app.js / server.js       # ساختار Fastify / entry point
```

## 🔌 API

داک کامل در **`/docs`** (صفحه‌ی خوانا) و **`/docs.json`** (OpenAPI). چند نمونه:

| Endpoint | توضیح |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` | ثبت‌نام / ورود (rate-limit سخت) |
| `GET /api/auth/me` | یوزر فعلی |
| `GET /api/albums` · `GET /api/albums/:id` | آلبوم‌ها + ترک‌ها |
| `GET /api/products` · `GET /api/products/:slug` | محصولات |
| `GET /api/cart` · `POST /api/cart/items` · `GET /api/cart/quote` | سبد و تخمین قیمت |
| `POST /api/orders` · `GET /api/orders` | ثبت سفارش + تاریخچه |
| `GET /api/wishlist` · `POST /api/wishlist/:productId` | ویس‌لیست |
| `POST /api/contact` | فرم تماس (rate-limited) |
| `PATCH /api/orders/:id/status` *(ادمین)* | تغییر وضعیت سفارش |
| `POST /api/coupons/campaigns` *(ادمین)* | کمپین + generate کد |
| `GET /api/health` | health + وضعیت DB + latency |

## 🧪 تست

```bash
createdb omid_stare_test
npm test          # node --test test/
```

- **۳۴ تست** با runner داخلی Node — صفر وابستگی اضافه
- جریان واقعی **E2E**: ثبت‌نام ← سبد ← کوپن ← سفارش ← وضعیت
- ۶ سوت: `auth` · `catalog` · `cart-order` · `coupons` · `users-orders` · `admin-moderation`
- DB تست جداست (`DATABASE_URL_TEST`) و پیش از هر سوت reset می‌شود

## 🔒 امنیت — چه‌هایی جاشونه

- **argon2id** برای رمز + rate-limit سخت روی register/login (ضد brute-force)
- session **کوکی امضاشده** (`sid`)؛ در production `SameSite=strict` و secure
- **helmet** + gzip + سقف body = 1MB
- **Redact در لاگ**: password، توکن session، کد کوپن — هیچ‌وقت log نمی‌شوند
- **denylist استاتیک**: `server/`، `.git`، `.env`، `node_modules`، … هرگز سرو نمی‌شوند
- **XSS**: ورودی یوزر (review، Q&A، سفارش‌ها) در همه‌ی نقاط رندر escape می‌شود
- **rate-limit** مجزا: auth، claim کوپن، سفارش، تماس، global

## ⚙️ متغیرهای محیطی

فایل کامل و کامنت‌خورده در **[`.env.example`](.env.example)**. مهم‌ها:

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `DATABASE_URL` | `postgres://omid:omid@localhost:5432/omid_stare` | |
| `SESSION_TTL_DAYS` | `7` | عمر session |
| `COOKIE_SECRET` | — | امضای کوکی (در production حتماً) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | برای seed و create-admin |
| `NOTIFICATION_CHANNELS` | `log,admin` | |
| `SHIPPING_AMOUNT` | `0` | هزینه‌ی ارسال |
| `RL_GLOBAL` / `RL_AUTH` / `RL_COUPON_CLAIM` / `RL_CONTACT` / `RL_ORDER` | `300/10/8/6/10` | rate limitها |

## 📁 ساختار ریپو

```
Omid-Stare/
├── index.html …            # ۱۱ صفحه‌ی فرانت‌اند (فارسی/RTL)
├── css/                    # ۱۲ sheet — هویت Psychedelic/Dark/Neon (~3.3k خط CSS/JS)
├── js/                     # ۱۵ فایل vanilla JS — صفر framework
├── images/                 # لوگو، مرچ، آلبوم‌ها، پس‌زمینه‌ها
├── server/
│   ├── src/                # مونولیت Fastify (modules + services + db)
│   ├── scripts/            # migrate · seed · create-admin
│   ├── migrations/         # 0001 core → 0002 coupons/contact → 0003 reviews/qa
│   └── test/               # node:test — ۳۴ تست
├── .env.example
├── AUDIT.md                # آدیت کامل ریپو (پیش از backend)
└── REVIEW.md               # ریویو خط‌به‌خط + باگ‌های پیدا شده و فیکس‌شده
```

## 🚀 production

```bash
NODE_ENV=production npm start
```

- در production خودکار: `SameSite=strict`، secure cookie، امضای کوکی از `COOKIE_SECRET`
- `trustProxy` فعال (پشت nginx/ALB راحت)
- `Cache-Control` ترازبندی‌شده: تصویر ۲۴h · css/js ۱h · HTML revalidate
- آپلودها (آواتار/مدیا) با نام UUID سرو می‌شوند → `immutable`
- `checkConnection` هنگام بوت: اگر DB down باشد سرور نمی‌افتد — `/api/health` وضعیت را نشان می‌دهد

---

<div align="center">

**OMID RASTAR ★ PSYCHEDELIC PROGRESSIVE — تهران ۱۴۰۴**

_«پراگرسیو سایکدلیک: جایی که زمان آب می‌شه و گیتار حرف می‌زنه.»_ 🌊

</div>

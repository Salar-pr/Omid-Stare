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

## 🚀 اجرا روی سیستم خودت (لوکال) — قدم‌به‌قدم

**پیش‌نیاز فقط:** [Node.js 20 یا بالاتر](https://nodejs.org) (فقط برای راهِ «دیتابیس جاسازیشده» همین کافی است — نیازی به نصب PostgreSQL یا Docker نیست).

> ⚠️ دو نکته که قبلاً توی README اشتباه بود و باعث «نمی‌تونم به دیتابیس وصل شم» می‌شد:
> 1. فایل تنظیمات **`server/.env`** است (نه `.env` در ریشه) — مثالش توی `server/.env.example` است.
> 2. برنامه با یوزر `omid` / رمز `omid` به دیتابیس `omid_stare` وصل می‌شود؛ این یوزر و دیتابیس باید **ساخته شده باشند** (نصب PostgreSQL به تنهایی کافی نیست).

### ✅ راهِ ۱ — دیتابیس جاسازیشده (ساده‌ترین؛ مخصوصاً برای ویندوز) 🐘

بدون نصب سرویس و بدون Docker؛ یک PostgreSQL واقعی با یک پوشه‌ی داده (`server/.pgdata`) بالا می‌آید — مثل «فایل دیتابیس» جنگو؛ پاک کردن آن پوشه = ریست کامل.

```bash
# ۱) برو توی پوشه‌ی سرور و پکیج‌ها را نصب کن
cd server
npm install

# ۲) فایل تنظیمات را بساز (یک‌بار)
#      ویندوز (cmd / PowerShell):    copy .env.example .env
#      مک / لینوکس:                  cp .env.example .env
#    (ادمین seed شده با ADMIN_EMAIL و ADMIN_PASSWORD همین فایل ساخته می‌شود)

# ۳) ترمینالِ ۱ — دیتابیس را روشن کن (اولین اجرا ~۶۰MB باینری دانلود می‌کند؛
#    خودش migrate و seed را هم اجرا می‌کند و تا وقتی باز است دیتابیس بالاست)
npm run db:embedded

# ۴) ترمینالِ ۲ — سرور سایت + API را روشن کن
npm run dev
```

بعد مرورگر: **http://localhost:3000** · داک API: **http://localhost:3000/api/docs** · پنل ادمین: **http://localhost:3000/admin.html**

> اگر پورت 5432 اشغال بود: یک بار `EMBEDDED_PG_PORT=5433` را در `server/.env` بگذار و `DATABASE_URL` را هم `postgres://omid:omid@localhost:5433/omid_stare` کن، بعد دوباره `npm run db:embedded`.

### 🐳 راهِ ۲ — Docker (اگر Docker Desktop داری)

```bash
docker compose up -d          # PostgreSQL 16 با یوزر omid/omid و دیتابیس omid_stare
cd server
npm install
copy .env.example .env        # ویندوز — یا cp .env.example .env
npm run migrate
npm run seed
npm run dev
```

### 🗄️ راهِ ۳ — نصب معمولی PostgreSQL روی خود سیستم

**ویندوز:** نصب‌کننده‌ی رسمی [EDB](https://www.postgresql.org/download/windows/) را نصب کن (در حین نصب یک رمز برای یوزر `postgres` بگذار و گزینه‌ی *pgAdmin* را نگه دار). بعد در pgAdmin یا SQL Shell (psql) این را اجرا کن:

```sql
CREATE ROLE omid LOGIN PASSWORD 'omid' SUPERUSER;
CREATE DATABASE omid_stare OWNER omid;
CREATE DATABASE omid_stare_test OWNER omid;   -- برای npm test
```

**مک (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
psql postgres -c "CREATE ROLE omid LOGIN PASSWORD 'omid' SUPERUSER"
createdb -O omid omid_stare && createdb -O omid omid_stare_test
```

**لینوکس (Debian/Ubuntu):**
```bash
sudo apt install postgresql
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE ROLE omid LOGIN PASSWORD 'omid' SUPERUSER"
sudo -u postgres createdb -O omid omid_stare && sudo -u postgres createdb -O omid omid_stare_test
```

بعد مثل راهِ ۲: `cd server && npm install`، `copy .env.example .env`، `npm run migrate && npm run seed && npm run dev`.

---

## 🎭 یوزر و رمزهای پیش‌فرض (برای تست لوکال)

این مقادیر از `server/.env.example` می‌آیند — اگر همان را کپی کرده باشی، `npm run seed` این حساب‌ها را می‌سازد:

| نقش | ایمیل | رمز | توضیح |
|---|---|---|---|
| 👑 **ادمین** | `admin@omid-stare.local` | `ChangeMe_Strong_1405` | به پنل ادمین (`admin.html`) دسترسی دارد |
| 🙋 یوزر نمونه | `sina@demo.void.ir` | `Omid1404!` | برای خرید/سبد/سفارش تستی |
| 🙋 یوزر نمونه | `arash@demo.void.ir` | `Omid1404!` | — |
| 🙋 یوزر نمونه | `niloofar@demo.void.ir` | `Omid1404!` | — |
| 🙋 یوزر نمونه | `kian@demo.void.ir` | `Omid1404!` | — |

> هر زمان خواستی ایمیل/رمز ادمین را عوض کنی: مقادیر `ADMIN_EMAIL` / `ADMIN_PASSWORD` در `server/.env` را تغییر بده و `npm run seed` (یا `npm run create-admin`) را دوباره اجرا کن. رمز باید حداقل ۸ کاراکتر و شامل حرف و عدد باشد.

---

## 🛠️ پنل ادمین (چطور واردش شوم؟)

پنل ادمین یک صفحه‌ی گرافیکی دارد: **`/admin.html`**

1. اول باید با **حساب ادمین** وارد شوی: صفحه‌ی «ورود/ثبت‌نام» (`account.html`) → ایمیل و رمز ادمین بالا را بزن.
2. بعد از ورود، صفحه‌ی پروفایل باز می‌شود و بالای داشبورد یک کارت **«پنل ادمین ⚙️»** می‌بینی → کلیک کن.
   (یا مستقیم برو به `http://localhost:3000/admin.html` و همان‌جا لاگین کن.)
3. داخل پنل: داشبورد آماری · مدیریت سفارش‌ها (تغییر وضعیت/پرداخت) · محصولات (ساخت/ویرایش/موجودی/فعال‌سازی) · آلبوم‌ها · کمپین‌های کد تخفیف و **تولید کد** · پیام‌های تماس · تایید نظرات و پاسخ به Q&A · کاربران · آپلود مدیا · نوتیفیکیشن‌ها.

**اگر فقط API می‌خواهی:** همه‌ی مسیرهای مدیریتی زیر `prefix` ادمین با همان کوکی ورود در دسترس‌اند (`GET/POST/PATCH/DELETE /api/admin/...`). لیست کامل را در صفحه‌ی مستندات **`/api/docs`** ببین. مثال:

```bash
# ورود و گرفتن session cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@omid-stare.local","password":"ChangeMe_Strong_1405"}'

# آمار داشبورد
curl -b cookies.txt http://localhost:3000/api/admin/dashboard
```

---

## ✨ تو جعبه چه‌هاست

**🎨 فرانت‌اند — فارسی، RTL، بدون هیچ framework** (صفحات: پورتال ورود، خانه، کاتالوگ آلبوم‌ها، فروشگاه، محصول، سبد، سفارش‌ها، ویش‌لیست، تماس، ورود/ثبت‌نام، پروفایل، ویرایش پروفایل + **پنل ادمین**)

**💿 آلبوم‌ها** — ۴ آلبوم با لیست ترک‌ها + پلیر؛ «welcome track» خودکار پخش می‌شود.

**🛒 فروشگاه** — سبد، هزینه‌ی ارسال، **کوپن و کمپین تخفیف**، جریان وضعیت سفارش با history.

**👤 کاربر** — ثبت‌نام/لاگین با session کوکیِ امضاشده، TTL قابل‌تنظیم، ویس‌لیست، پروفایل و آواتار.

**🛠️ پنل ادمین** — داشبورد · CRUD محصول · مدیریت آلبوم و ترک · سفارش‌ها (تغییر وضعیت) · کمپین‌های کوپن (generate انبوه کد) · پیام‌های تماس · نوتیفیکیشن داخل سایت · آپلود مدیا · لیست یوزرها · مودریشن نظر و Q&A.

**📡 نوتیفیکیشن** — سرویس کانال‌محور؛ رویدادهایی مثل `order_created` به کانال‌های `log` و `admin` می‌روند.

## 🧱 استک

| لایه | تکنولوژی |
|---|---|
| فرانت | Vanilla HTML/CSS/JS (بدون build) · فونت Vazirmatn + Space Grotesk · هویت Psychedelic/Dark/Neon |
| API | **Fastify 5** · اعتبارسنجی با **zod** |
| دیتابیس | **PostgreSQL** · **Drizzle ORM** · pool با `pg` |
| Auth | **argon2id** · کوکی session امضاشده (`sid`) |
| امنیت | helmet · gzip · rate-limit · redact لاگ · denylist استاتیک |
| تست | **`node:test`** داخلی — ۳۴ تست E2E (`npm test`) |

## 🏗️ معماری

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
│   ├── content/    # محتوای قابل‌ویرایش سایت
│   ├── admin/      # داشبورد، سفارش‌ها، مدیا، moderation
│   └── docs/       # داک API (docs.html + openapi.json)
├── db/                      # client + schema (Drizzle) + migrate
├── config/                  # env یک‌بار خوانده و validate می‌شود
└── app.js / server.js
```

## 🔌 API — چند نمونه

| Endpoint | توضیح |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` | ثبت‌نام / ورود (rate-limit سخت) |
| `GET /api/auth/me` | یوزر فعلی |
| `GET /api/albums` · `GET /api/products` | کاتالوگ |
| `GET /api/cart` · `POST /api/cart/items` · `GET /api/cart/quote` | سبد |
| `POST /api/orders` · `GET /api/orders` | ثبت سفارش + تاریخچه |
| `GET /api/admin/dashboard` · `PATCH /api/admin/orders/:id/status` *(ادمین)* | مدیریت |
| `POST /api/coupons/campaigns` *(ادمین)* | کمپین + generate کد |
| `GET /api/health` | health + وضعیت DB |

## 🧪 تست

```bash
# دیتابیس omid_stare_test باید ساخته شده باشد (راه‌های بالا)
cd server
npm test          # ۳۴ تست E2E با node:test — بدون وابستگی اضافه
```

## ⚙️ متغیرهای محیطی

فایل کامل و کامنت‌خورده: **`server/.env.example`** (بعد از کپی به `server/.env`).

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `PORT` / `HOST` | `3000` / `0.0.0.0` | |
| `DATABASE_URL` | `postgres://omid:omid@localhost:5432/omid_stare` | |
| `SESSION_TTL_DAYS` | `7` | عمر session |
| `COOKIE_SECRET` | — | امضای کوکی (در production حتماً) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | ادمینِ ساخته‌شده توسط seed / create-admin |
| `NOTIFICATION_CHANNELS` | `log,admin` | |
| `SHIPPING_AMOUNT` | `0` | هزینه‌ی ارسال |
| `DATABASE_URL_TEST` | `…/omid_stare_test` | دیتابیس تست |

## 📁 ساختار ریپو

```
Omid-Stare/
├── index.html … admin.html    # صفحات فرانت‌اند (فارسی/RTL)
├── css/  js/  images/         # استایل، اسکریپت، مدیا
├── server/
│   ├── src/                   # مونولیت Fastify (modules + services + db)
│   ├── scripts/               # migrate · seed · create-admin · db-embedded
│   ├── migrations/            # 0001 core → 0002 coupons/contact → 0003 reviews/qa
│   └── test/                  # node:test — ۳۴ تست
├── server/.env.example        # ← تنظیمات نمونه (کپی به server/.env)
├── docker-compose.yml         # فقط PostgreSQL — برای راهِ Docker
├── AUDIT.md / REVIEW.md
└── README.md
```

## 🚀 production

```bash
NODE_ENV=production npm start
```

- در production خودکار: `SameSite=strict`، secure cookie، امضای کوکی از `COOKIE_SECRET`
- `trustProxy` فعال (پشت nginx/ALB راحت) · Cache-Control ترازبندی‌شده · آپلودها UUID → immutable
- `checkConnection` هنگام بوت: اگر DB down باشد سرور نمی‌افتد — `/api/health` وضعیت را نشان می‌دهد

---

<div align="center">

**OMID RASTAR ★ PSYCHEDELIC PROGRESSIVE — تهران ۱۴۰۴**

_«پراگرسیو سایکدلیک: جایی که زمان آب می‌شه و گیتار حرف می‌زنه.»_ 🌊

</div>

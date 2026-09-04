// ============================================
// ADMIN.JS — پنل مدیریت OMID RASTAR
// همه‌ی داده‌ها از /api/admin/* (session cookie) می‌آید.
// ============================================
(function () {
  'use strict';
  var esc = window.escHtml || function (s) { return String(s == null ? '' : s); };
  var fmtNum = window.fmtNum || function (n) { return n; };
  var fmtDate = window.fmtDate || function (s) { return s || ''; };
  var toast = window.showToast || function () {};
  function errMsg(e, fb) { return window.API ? window.API.msg(e, fb) : (fb || 'خطا'); }
  function failToast(e, fb) { toast(errMsg(e, fb), true); }

  function api(method, url, body) {
    return window.API[method](url, body).then(function (d) { return d.data; });
  }

  var STATUS_L = { pending: 'در انتظار', confirmed: 'تایید شده', processing: 'در حال پردازش', shipped: 'ارسال شده', delivered: 'تحویل شده', cancelled: 'لغو شده' };
  var PAY_L = { unpaid: 'پرداخت نشده', pending: 'در انتظار پرداخت', paid: 'پرداخت شده', failed: 'ناموفق', refunded: 'عودت شده' };
  // هماهنگ با TRANSITIONS در server (تغییرهای معقول فقط)
  var TRANSITIONS = {
    pending: ['confirmed', 'processing', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  };
  var PAYMENTS = ['unpaid', 'pending', 'paid', 'failed', 'refunded'];

  function chipOk(v) { return '<span class="chip ok">' + v + '</span>'; }
  function chipNo(v) { return '<span class="chip no">' + v + '</span>'; }
  function chipWarn(v) { return '<span class="chip warn">' + v + '</span>'; }
  function chipInfo(v) { return '<span class="chip info">' + v + '</span>'; }
  function money(n) { return fmtNum(n) + ' تومان'; }

  // ============================================
  // وضعیت ارسال — چه سفارش‌هایی رفته، چه‌هایی مانده
  // ============================================
  var ffGroup = 'pending';

  function ffCard(cls, icon, label, value, sub) {
    return (
      '<div class="ff-card ' + cls + '">' +
        '<div class="ff-ic">' + icon + '</div>' +
        '<div class="ff-body">' +
          '<div class="ff-num">' + fmtNum(value) + '</div>' +
          '<div class="ff-lbl">' + label + '</div>' +
          (sub ? '<div class="ff-sub">' + sub + '</div>' : '') +
        '</div>' +
      '</div>'
    );
  }

  function renderFulfillCards() {
    var box = document.getElementById('ff-cards');
    if (!box) return;
    box.innerHTML = '<div class="empty">در حال بارگذاری…</div>';

    api('get', '/admin/fulfillment/summary').then(function (d) {
      var sh = d.shipped, pn = d.pending;

      box.innerHTML =
        ffCard('ok', '✅', 'ارسال‌شده', sh.total,
          'در راه: ' + fmtNum(sh.inTransit) + ' · تحویل‌شده: ' + fmtNum(sh.delivered)) +
        ffCard('warn', '📦', 'در انتظار ارسال', pn.total,
          'جدید: ' + fmtNum(pn.newOrders) + ' · تایید: ' + fmtNum(pn.confirmed) + ' · پردازش: ' + fmtNum(pn.processing)) +
        ffCard(pn.stale ? 'bad' : 'mut', '⚠️', 'معطل‌مانده', pn.stale,
          'بیش از ' + fmtNum(d.staleDays) + ' روز بدون ارسال') +
        ffCard(pn.paidAwaiting ? 'bad' : 'mut', '💰', 'پرداخت‌شده ولی نرفته', pn.paidAwaiting,
          'پول گرفته شده، ارسال نشده') +
        ffCard('info', '🧾', 'ارزش سفارش‌های مانده', pn.value, 'تومان') +
        ffCard('mut', '✖️', 'لغوشده', d.cancelled, 'خارج از آمار عملیاتی');

      // نوار پیشرفت
      var prog = document.getElementById('ff-progress');
      if (prog) {
        prog.classList.remove('hidden');
        var fill = document.getElementById('ff-bar-fill');
        if (fill) fill.style.width = d.fulfillmentRate + '%';
        document.getElementById('ff-lg-shipped').textContent = fmtNum(sh.total);
        document.getElementById('ff-lg-pending').textContent = fmtNum(pn.total);
        document.getElementById('ff-lg-rate').textContent =
          d.fulfillmentRate + '٪ از سفارش‌های عملیاتی انجام شده';
      }
    }).catch(function (e) {
      box.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا در دریافت آمار ارسال')) + '</div>';
    });
  }

  var FF_HINTS = {
    pending: 'این سفارش‌ها هنوز ارسال نشده‌اند. قدیمی‌ترین‌ها بالا هستند تا اول به آن‌ها برسی.',
    stale: 'این‌ها بیش از حد معطل مانده‌اند — مشتری منتظر است. اولویت اول.',
    shipped: 'این سفارش‌ها از انبار خارج شده‌اند (ارسال‌شده یا تحویل‌شده). تازه‌ترین‌ها بالا.',
    all: 'همه‌ی سفارش‌ها بدون فیلتر، از قدیمی به جدید.',
  };

  function renderFulfillList(group) {
    ffGroup = group;
    var box = document.getElementById('ff-tbl');
    if (!box) return;
    box.innerHTML = '<tr><td class="empty" colspan="8">در حال بارگذاری…</td></tr>';

    var hint = document.getElementById('ff-hint');
    if (hint) hint.textContent = FF_HINTS[group] || '';

    // دکمه‌ی فعال
    var tabs = document.querySelectorAll('#ff-tabs button');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-group') === group);
    }

    api('get', '/admin/fulfillment/orders?group=' + group + '&limit=50').then(function (d) {
      var items = d.items || [];
      if (!items.length) {
        var msg = group === 'stale'
          ? 'هیچ سفارش معطلی نیست 🎉 همه به‌موقع رسیدگی شده‌اند.'
          : group === 'pending'
            ? 'هیچ سفارشی در انتظار ارسال نیست 🎉'
            : 'موردی پیدا نشد.';
        box.innerHTML = '<tr><td class="empty" colspan="8">' + msg + '</td></tr>';
        return;
      }

      box.innerHTML =
        '<tr><th>شماره</th><th>مشتری</th><th>اقلام</th><th>مبلغ</th>' +
        '<th>وضعیت</th><th>پرداخت</th><th>سن سفارش</th><th>اقدام</th></tr>' +
        items.map(function (o) {
          var isShipped = o.status === 'shipped' || o.status === 'delivered';

          // سن سفارش: برای معطل‌ها قرمز
          var age = o.isStale
            ? chipNo(fmtNum(o.ageDays) + ' روز ⚠️')
            : isShipped
              ? '<span class="mut">' + fmtNum(o.ageDays) + ' روز</span>'
              : chipWarn(fmtNum(o.ageDays) + ' روز');

          var st = isShipped ? chipOk(STATUS_L[o.status]) : chipWarn(STATUS_L[o.status] || o.status);
          var pay = o.paymentStatus === 'paid' ? chipOk(PAY_L.paid) : chipInfo(PAY_L[o.paymentStatus] || o.paymentStatus);

          // اقدام سریع: گذار بعدی منطقی
          var next = (TRANSITIONS[o.status] || []).filter(function (s) { return s !== 'cancelled'; })[0];
          var act = next
            ? '<button class="small" type="button" data-act="ff-advance" data-id="' + o.id +
              '" data-next="' + next + '">→ ' + esc(STATUS_L[next] || next) + '</button>'
            : '<span class="mut">—</span>';

          return '<tr' + (o.isStale ? ' class="row-stale"' : '') + '>' +
            '<td class="mono">' + esc(o.orderNumber) + '</td>' +
            '<td>' + esc(o.customerName) +
              '<div class="mut mono" dir="ltr" style="text-align:right">' + esc(o.customerPhone || '') + '</div>' +
              (o.city ? '<div class="mut">' + esc(o.city) + '</div>' : '') +
            '</td>' +
            '<td>' + fmtNum(o.units) + ' عدد<div class="mut">' + fmtNum(o.itemsCount) + ' قلم</div></td>' +
            '<td>' + money(o.totalAmount) + '</td>' +
            '<td>' + st + '</td>' +
            '<td>' + pay + '</td>' +
            '<td>' + age + '</td>' +
            '<td><div class="actions">' + act + '</div></td>' +
            '</tr>';
        }).join('');
    }).catch(function (e) {
      box.innerHTML = '<tr><td class="empty" colspan="8">' + esc(errMsg(e, 'خطا در دریافت لیست')) + '</td></tr>';
    });
  }

  // ---------- navigation ----------
  var SECTIONS = ['dash', 'orders', 'fulfill', 'products', 'albums', 'coupons', 'messages', 'reviews', 'users', 'media', 'notifs'];
  var loaded = {};

  function showSection(name) {
    SECTIONS.forEach(function (s) {
      var sec = document.getElementById('sec-' + s);
      if (sec) sec.classList.toggle('hidden', s !== name);
      var btn = document.querySelector('.side button[data-sec="' + s + '"]');
      if (btn) btn.classList.toggle('on', s === name);
    });
    var loader = LOADERS[name];
    if (loader && !loaded[name]) {
      loaded[name] = true;
      loader();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- gate ----------
  function currentUser() {
    return window.API.me().catch(function () { return null; });
  }

  function enterPanel(user) {
    if (!user) {
      document.getElementById('gateDenied').classList.add('hidden');
      document.getElementById('gateLogin').classList.remove('hidden');
      document.getElementById('panel').classList.add('hidden');
      document.getElementById('gate').classList.remove('hidden');
      return;
    }
    if (user.role !== 'admin') {
      document.getElementById('gateLogin').classList.add('hidden');
      document.getElementById('gateDenied').classList.remove('hidden');
      document.getElementById('panel').classList.add('hidden');
      document.getElementById('gate').classList.remove('hidden');
      return;
    }
    document.getElementById('gate').classList.add('hidden');
    document.getElementById('panel').classList.remove('hidden');
    document.getElementById('whoName').textContent = user.name;
    showSection('dash');
  }

  function logout() {
    window.API.post('/auth/logout')
      .catch(function () {})
      .finally(function () {
        window.location.href = 'account.html';
      });
  }

  // ==========================================================
  // LOADERS
  // ==========================================================
  var LOADERS = {
    // ---------- dashboard ----------
    dash: function () {
      var statsEl = document.getElementById('dash-stats');
      statsEl.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
      api('get', '/admin/dashboard').then(function (d) {
        var s = d.orders, p = d.products, u = d.users, rv = d.revenue;
        statsEl.innerHTML =
          statCard('کاربران', u.total, 'lime', u.new30d + ' جدیدِ ۳۰ روز') +
          statCard('محصولات فعال', p.active + ' / ' + p.total, 'cyan', p.outOfStock + ' ناموجود') +
          statCard('سفارش‌ها', s.total, 'magenta', s.pending + ' در انتظار · ' + s.last7d + ' هفته‌ی اخیر') +
          statCard('فروش (پرداخت‌شده)', money(rv.total), 'amber', '۳۰ روز: ' + money(rv.last30d)) +
          statCard('کد تخفیف آماده', d.coupons.unclaimed, 'lime', d.coupons.active_campaigns + ' کمپین فعال') +
          statCard('پیام‌های خوانده‌نشده', d.messages.unread, d.messages.unread ? 'magenta' : 'cyan', '') +
          statCard('وضعیت دیتابیس', d.health.db, d.health.db === 'up' ? 'ok' : 'no', d.health.dbLatencyMs + 'ms');

        var low = document.getElementById('dash-lowstock');
        if (!d.lowStock || !d.lowStock.length) {
          low.innerHTML = '<tr><td class="empty" colspan="3">همه‌چیز موجوده — کمبودی نیست ✅</td></tr>';
          return;
        }
        low.innerHTML =
          '<tr><th>محصول</th><th>slug</th><th>موجودی</th></tr>' +
          d.lowStock.map(function (r) {
            return '<tr><td>' + esc(r.name) + '</td><td class="mono mut">' + esc(r.slug) +
              '</td><td>' + chipWarn(r.stock) + '</td></tr>';
          }).join('');
      }).catch(function (e) {
        statsEl.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا در دریافت داشبورد')) + '</div>';
      });
    },

    // ---------- orders ----------
    orders: function () {
      var box = document.getElementById('orders-tbl');
      box.innerHTML = '<tr><td class="empty" colspan="7">در حال بارگذاری…</td></tr>';
      api('get', '/admin/orders?limit=50').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          box.innerHTML = '<tr><td class="empty" colspan="7">هنوز سفارشی ثبت نشده.</td></tr>';
          return;
        }
        box.innerHTML =
          '<tr><th>شماره</th><th>مشتری</th><th>جمع</th><th>وضعیت</th><th>پرداخت</th><th>تاریخ</th><th>اقدام</th></tr>' +
          items.map(function (o) {
            var current = o.status;
            var opts = [current].concat(TRANSITIONS[current] || []);
            var statusSel =
              '<select class="sel-status" data-id="' + o.id + '">' +
              opts.map(function (st) { return '<option value="' + st + '"' + (st === current ? ' selected' : '') + '>' + (STATUS_L[st] || st) + '</option>'; }).join('') +
              '</select>';
            var paySel =
              '<select class="sel-pay" data-id="' + o.id + '">' +
              PAYMENTS.map(function (pm) { return '<option value="' + pm + '"' + (pm === o.paymentStatus ? ' selected' : '') + '>' + (PAY_L[pm] || pm) + '</option>'; }).join('') +
              '</select>';
            return '<tr>' +
              '<td class="mono">' + esc(o.orderNumber) + '</td>' +
              '<td>' + esc(o.customerName) + '<div class="mut mono" dir="ltr" style="text-align:right">' + esc(o.customerPhone || '') + '</div></td>' +
              '<td>' + money(o.totalAmount) + '</td>' +
              '<td>' + statusSel + '</td>' +
              '<td>' + paySel + '</td>' +
              '<td class="mut">' + fmtDate(o.createdAt) + '</td>' +
              '<td><div class="actions"><button class="small" type="button" data-act="order-save" data-id="' + o.id + '">ثبت تغییر</button></div></td>' +
              '</tr>';
          }).join('');
      }).catch(function (e) {
        box.innerHTML = '<tr><td class="empty">' + esc(errMsg(e, 'خطا در دریافت سفارش‌ها')) + '</td></tr>';
      });
    },

    // ---------- fulfillment (وضعیت ارسال) ----------
    fulfill: function () {
      renderFulfillCards();
      renderFulfillList(ffGroup);
    },

    // ---------- products ----------
    products: function () {
      var box = document.getElementById('products-tbl');
      box.innerHTML = '<tr><td class="empty" colspan="7">در حال بارگذاری…</td></tr>';
      api('get', '/admin/products?limit=50').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          box.innerHTML = '<tr><td class="empty" colspan="7">محصولی نیست.</td></tr>';
          return;
        }
        box.innerHTML =
          '<tr><th></th><th>نام</th><th>دسته</th><th>قیمت</th><th>موجودی</th><th>وضعیت</th><th>اقدامات</th></tr>' +
          items.map(function (p) {
            var img = p.image ? '<img class="thumb" src="' + esc(p.image) + '" alt="" loading="lazy" />' : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:#666">—</div>';
            return '<tr>' +
              '<td>' + img + '</td>' +
              '<td>' + esc(p.name) + '<div class="mut mono" style="direction:ltr;text-align:right">' + esc(p.slug) + '</div></td>' +
              '<td>' + esc(p.category || '—') + '</td>' +
              '<td>' + money(p.price) + (p.compareAtPrice ? '<div class="mut" style="text-decoration:line-through">' + money(p.compareAtPrice) + '</div>' : '') + '</td>' +
              '<td><input type="number" min="0" class="stock-inp" data-id="' + p.id + '" value="' + p.stock + '" style="width:64px" /> ' +
              '<button class="small" type="button" data-act="stock-save" data-id="' + p.id + '">ثبت</button></td>' +
              '<td>' + (p.isActive ? chipOk('فعال') : chipNo('غیرفعال')) + '</td>' +
              '<td><div class="actions">' +
              '<button class="small" type="button" data-act="prod-toggle" data-id="' + p.id + '" data-active="' + p.isActive + '">' + (p.isActive ? 'غیرفعال کن' : 'فعال کن') + '</button>' +
              '<button class="small" type="button" data-act="prod-edit" data-id="' + p.id + '">ویرایش</button>' +
              '<button class="small danger" type="button" data-act="prod-del" data-id="' + p.id + '">حذف</button>' +
              '</div></td></tr>';
          }).join('');
      }).catch(function (e) {
        box.innerHTML = '<tr><td class="empty">' + esc(errMsg(e, 'خطا در دریافت محصولات')) + '</td></tr>';
      });
    },

    // ---------- albums ----------
    albums: function () {
      var box = document.getElementById('albums-tbl');
      box.innerHTML = '<tr><td class="empty" colspan="6">در حال بارگذاری…</td></tr>';
      api('get', '/admin/albums').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          box.innerHTML = '<tr><td class="empty" colspan="6">آلبومی نیست.</td></tr>';
          return;
        }
        box.innerHTML =
          '<tr><th></th><th>عنوان</th><th>سال / ژانر</th><th>ترک</th><th>وضعیت</th><th>اقدامات</th></tr>' +
          items.map(function (a) {
            var img = a.coverImage ? '<img class="thumb" src="' + esc(a.coverImage) + '" alt="" loading="lazy" />' : '<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:#666">—</div>';
            return '<tr>' +
              '<td>' + img + '</td>' +
              '<td><b>' + esc(a.title) + '</b>' + (a.titleFa ? '<div class="mut">' + esc(a.titleFa) + '</div>' : '') + '</td>' +
              '<td>' + esc(a.year) + ' · <span class="mut">' + esc(a.genre || '—') + '</span></td>' +
              '<td>' + esc(a.trackCount) + '</td>' +
              '<td>' + (a.isPublished ? chipOk('منتشر') : chipNo('پیش‌نویس')) + '</td>' +
              '<td><div class="actions">' +
              '<button class="small" type="button" data-act="album-up" data-id="' + a.id + '" title="بالا">↑</button>' +
              '<button class="small" type="button" data-act="album-down" data-id="' + a.id + '" title="پایین">↓</button>' +
              '<button class="small" type="button" data-act="album-pub" data-id="' + a.id + '" data-pub="' + a.isPublished + '">' + (a.isPublished ? 'پیش‌نویس کن' : 'منتشر کن') + '</button>' +
              '<button class="small danger" type="button" data-act="album-del" data-id="' + a.id + '">حذف</button>' +
              '</div></td></tr>';
          }).join('');
      }).catch(function (e) {
        box.innerHTML = '<tr><td class="empty">' + esc(errMsg(e, 'خطا در دریافت آلبوم‌ها')) + '</td></tr>';
      });
    },

    // ---------- coupons ----------
    coupons: function () {
      var box = document.getElementById('coupons-tbl');
      box.innerHTML = '<tr><td class="empty" colspan="6">در حال بارگذاری…</td></tr>';
      api('get', '/admin/coupons/campaigns').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          box.innerHTML = '<tr><td class="empty" colspan="6">کمپینی نیست — با فرم پایین بساز.</td></tr>';
          return;
        }
        box.innerHTML =
          '<tr><th>نام</th><th>تخفیف</th><th>کدها</th><th>انقضا</th><th>وضعیت</th><th>اقدامات</th></tr>' +
          items.map(function (c) {
            var discount = c.discountType === 'percentage' ? '%' + esc(c.discountValue) : money(c.discountValue);
            return '<tr>' +
              '<td>' + esc(c.name) + '</td>' +
              '<td>' + discount + '</td>' +
              '<td>' + esc(c.redeemedCount || 0) + ' مصرف / ' + esc(c.codeCount) + ' کد' +
              '<div class="mut">' + esc(c.claimedCount || 0) + ' claim شده</div></td>' +
              '<td class="mut">' + fmtDate(c.expiresAt) + '</td>' +
              '<td>' + (c.isActive ? chipOk('فعال') : chipNo('غیرفعال')) + '</td>' +
              '<td><div class="actions">' +
              '<button class="small" type="button" data-act="codes-gen" data-id="' + c.id + '">+۱۰ کد</button>' +
              '<button class="small" type="button" data-act="camp-toggle" data-id="' + c.id + '" data-active="' + c.isActive + '">' + (c.isActive ? 'متوقف کن' : 'فعال کن') + '</button>' +
              '<button class="small danger" type="button" data-act="camp-del" data-id="' + c.id + '">حذف</button>' +
              '</div></td></tr>';
          }).join('');
      }).catch(function (e) {
        box.innerHTML = '<tr><td class="empty">' + esc(errMsg(e, 'خطا در دریافت کمپین‌ها')) + '</td></tr>';
      });
    },

    // ---------- messages ----------
    messages: function () {
      var list = document.getElementById('messages-list');
      list.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
      api('get', '/admin/messages?limit=50').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          list.innerHTML = '<div class="empty">پیامی نیست. پیام‌های فرم تماس اینجا می‌آیند.</div>';
          return;
        }
        list.innerHTML = items.map(function (m) {
          var statusChip = m.status === 'unread' ? chipWarn('جدید') : m.status === 'archived' ? chipNo('بایگانی') : chipInfo('خوانده‌شده');
          return '<div class="card">' +
            '<div class="row1"><span class="nm">' + esc(m.name) + '</span><span class="mut mono" dir="ltr">' + esc(m.email || '') + '</span>' + statusChip +
            '<span class="dt">' + fmtDate(m.createdAt) + '</span></div>' +
            '<div class="msg">' + esc(m.message) + '</div>' +
            '<div class="actions" style="margin-top:10px">' +
            '<button class="small" type="button" data-act="msg-read" data-id="' + m.id + '">خوانده شد</button>' +
            '<button class="small" type="button" data-act="msg-archive" data-id="' + m.id + '">بایگانی</button>' +
            '<button class="small danger" type="button" data-act="msg-del" data-id="' + m.id + '">حذف</button>' +
            '</div></div>';
        }).join('');
      }).catch(function (e) {
        list.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا در دریافت پیام‌ها')) + '</div>';
      });
    },

    // ---------- reviews & questions ----------
    reviews: function () {
      var rl = document.getElementById('reviews-list');
      rl.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
      api('get', '/admin/reviews?limit=50').then(function (d) {
        var items = d.items || [];
        rl.innerHTML = items.length
          ? items.map(function (r) {
              var stars = '';
              for (var i = 0; i < 5; i++) stars += i < r.rating ? '★' : '☆';
              return '<div class="card">' +
                '<div class="row1"><span class="nm">' + esc(r.user) + '</span><span class="mut">' + esc(r.product || '') + '</span>' +
                '<span style="color:var(--amber)">' + stars + '</span>' +
                (r.isApproved ? chipOk('تاییدشده') : chipWarn('در انتظار')) +
                '<span class="dt">' + fmtDate(r.createdAt) + '</span></div>' +
                '<div class="msg">' + esc(r.body) + '</div>' +
                '<div class="actions" style="margin-top:8px">' +
                (r.isApproved
                  ? '<button class="small" type="button" data-act="rev-hide" data-id="' + r.id + '">لغو تایید</button>'
                  : '<button class="small" type="button" data-act="rev-ok" data-id="' + r.id + '">✅ تایید و انتشار</button>') +
                '</div></div>';
            }).join('')
          : '<div class="empty">نظری ثبت نشده.</div>';
      }).catch(function (e) {
        rl.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا')) + '</div>';
      });

      var ql = document.getElementById('questions-list');
      ql.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
      api('get', '/admin/questions?limit=50').then(function (d) {
        var items = d.items || [];
        ql.innerHTML = items.length
          ? items.map(function (q) {
              return '<div class="card">' +
                '<div class="row1"><span class="nm">' + esc(q.author) + '</span><span class="mut">' + esc(q.product || '') + '</span>' +
                (q.isPublished ? chipOk('منتشر') : chipNo('پنهان')) +
                '<span class="dt">' + fmtDate(q.createdAt) + '</span></div>' +
                '<div class="msg"><b>سوال:</b> ' + esc(q.question) + '</div>' +
                (q.answer ? '<div class="msg" style="color:var(--cyan)"><b>پاسخ:</b> ' + esc(q.answer) + '</div>' : '') +
                '<div class="field full" style="margin-top:8px">' +
                '<input type="text" class="q-answer-inp" data-id="' + q.id + '" placeholder="پاسخ را بنویس…" value="' + esc(q.answer || '') + '" />' +
                '</div>' +
                '<div class="actions" style="margin-top:6px">' +
                '<button class="small" type="button" data-act="q-answer" data-id="' + q.id + '">ثبت پاسخ / انتشار</button>' +
                '<button class="small" type="button" data-act="q-toggle" data-id="' + q.id + '" data-pub="' + q.isPublished + '">' + (q.isPublished ? 'پنهان کن' : 'نمایش بده') + '</button>' +
                '</div></div>';
            }).join('')
          : '<div class="empty">سوالی ثبت نشده.</div>';
      }).catch(function (e) {
        ql.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا')) + '</div>';
      });
    },

    // ---------- users ----------
    users: function () {
      var box = document.getElementById('users-tbl');
      box.innerHTML = '<tr><td class="empty" colspan="6">در حال بارگذاری…</td></tr>';
      api('get', '/admin/users?limit=50').then(function (d) {
        var items = d.items || [];
        if (!items.length) {
          box.innerHTML = '<tr><td class="empty" colspan="6">کاربری نیست.</td></tr>';
          return;
        }
        box.innerHTML =
          '<tr><th>نام</th><th>ایمیل</th><th>نقش</th><th>وضعیت</th><th>سفارش‌ها</th><th>اقدام</th></tr>' +
          items.map(function (u) {
            return '<tr>' +
              '<td>' + esc(u.name) + '</td>' +
              '<td class="mono" dir="ltr">' + esc(u.email) + '</td>' +
              '<td>' + (u.role === 'admin' ? chipInfo('مدیر') : chipInfo('کاربر')) + '</td>' +
              '<td>' + (u.isActive ? chipOk('فعال') : chipNo('غیرفعال')) + '</td>' +
              '<td>' + fmtNum(u.ordersCount || 0) + '</td>' +
              '<td><button class="small" type="button" data-act="user-toggle" data-id="' + u.id + '" data-active="' + u.isActive + '" data-email="' + esc(u.email) + '">' +
              (u.isActive ? 'غیرفعال کن' : 'فعال کن') + '</button></td></tr>';
          }).join('');
      }).catch(function (e) {
        box.innerHTML = '<tr><td class="empty">' + esc(errMsg(e, 'خطا در دریافت کاربران')) + '</td></tr>';
      });
    },

    // ---------- notifications ----------
    notifs: function () {
      var list = document.getElementById('notifs-list');
      list.innerHTML = '<div class="empty">در حال بارگذاری…</div>';
      api('get', '/admin/notifications').then(function (d) {
        var items = d.items || [];
        list.innerHTML = items.length
          ? items.map(function (n) {
              var payload = '';
              try { payload = JSON.stringify(n.payload, null, 1); } catch (e) { payload = String(n.payload); }
              return '<div class="notif-item"><div><div class="t">' + esc(n.type) + '</div>' +
                '<div class="mono mut" style="white-space:pre-wrap;font-size:.72rem">' + esc(payload) + '</div></div>' +
                '<div class="dt mut" style="margin-inline-start:auto;font-size:.7rem">' + fmtDate(n.createdAt) + '</div></div>';
            }).join('')
          : '<div class="empty">نوتیفیکیشنی نیست (مثلاً با ثبت سفارش جدید ساخته می‌شود).</div>';
      }).catch(function (e) {
        list.innerHTML = '<div class="empty">' + esc(errMsg(e, 'خطا')) + '</div>';
      });
    },
  };

  function statCard(k, v, color, s) {
    return '<div class="stat"><div class="k">' + esc(k) + '</div><div class="v ' + esc(color) + '">' + esc(String(v)) +
      '</div>' + (s ? '<div class="s">' + esc(s) + '</div>' : '') + '</div>';
  }

  // ==========================================================
  // ACTIONS (event delegation)
  // ==========================================================
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('button') : null;
    if (!btn) return;

    var act = btn.getAttribute('data-act');
    var id = btn.getAttribute('data-id');

    // ---------- بخش‌بندی ----------
    if (btn.hasAttribute('data-sec')) { showSection(btn.getAttribute('data-sec')); return; }
    if (btn.hasAttribute('data-reload')) { LOADERS[btn.getAttribute('data-reload')](); return; }

    // ---------- وضعیت ارسال ----------
    if (btn.hasAttribute('data-group')) {
      renderFulfillList(btn.getAttribute('data-group'));
      return;
    }

    // اقدام سریع: بردن سفارش به مرحله‌ی بعد بدون رفتن به تب سفارش‌ها
    if (act === 'ff-advance') {
      var nextSt = btn.getAttribute('data-next');
      btn.disabled = true;
      api('patch', '/admin/orders/' + id + '/status', { status: nextSt })
        .then(function () {
          toast('سفارش به «' + (STATUS_L[nextSt] || nextSt) + '» رفت ✅');
          renderFulfillCards();
          renderFulfillList(ffGroup);
          loaded.orders = false; // تب سفارش‌ها دفعه‌ی بعد تازه شود
          loaded.dash = false;
        })
        .catch(function (er) { btn.disabled = false; failToast(er, 'خطا در تغییر وضعیت'); });
      return;
    }

    // ---------- سفارش ----------
    if (act === 'order-save') {
      var sel = document.querySelector('.sel-status[data-id="' + id + '"]');
      var selP = document.querySelector('.sel-pay[data-id="' + id + '"]');
      if (!sel) return;
      api('patch', '/admin/orders/' + id + '/status', { status: sel.value, paymentStatus: selP.value })
        .then(function () { toast('وضعیت سفارش ذخیره شد ✅'); LOADERS.orders(); })
        .catch(function (er) { failToast(er, 'خطا در تغییر وضعیت'); });
      return;
    }

    // ---------- محصولات ----------
    if (act === 'prod-toggle') {
      api('patch', '/admin/products/' + id, { isActive: btn.getAttribute('data-active') === 'false' })
        .then(function () { toast('وضعیت محصول عوض شد'); LOADERS.products(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'stock-save') {
      var inp = document.querySelector('.stock-inp[data-id="' + id + '"]');
      if (!inp) return;
      var stock = parseInt(inp.value, 10);
      if (!Number.isFinite(stock) || stock < 0) { toast('موجودی معتبر نیست', true); return; }
      api('patch', '/admin/products/' + id, { stock: stock })
        .then(function () { toast('موجودی ذخیره شد ✅'); LOADERS.products(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'prod-edit') {
      api('get', '/admin/products/' + id).then(function (p) {
        document.getElementById('product-form-title').textContent = '✏️ ویرایش محصول — ' + p.name;
        document.getElementById('pf-id').value = p.id;
        document.getElementById('pf-name').value = p.name || '';
        document.getElementById('pf-slug').value = p.slug || '';
        document.getElementById('pf-category').value = p.category || '';
        document.getElementById('pf-price').value = p.price || 0;
        document.getElementById('pf-compare').value = p.compareAtPrice == null ? '' : p.compareAtPrice;
        document.getElementById('pf-stock').value = p.stock != null ? p.stock : 0;
        document.getElementById('pf-badge').value = p.badge || '';
        document.getElementById('pf-image').value = p.image || '';
        document.getElementById('pf-description').value = p.description || '';
        document.getElementById('pf-active').checked = !!p.isActive;
        document.getElementById('pf-cancel').style.display = '';
        document.getElementById('sec-products').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }).catch(function (er) { failToast(er, 'خطا در دریافت محصول'); });
      return;
    }
    if (act === 'prod-del') {
      if (!confirm('محصول حذف شود؟ (آرشیو — در فروشگاه نمایش داده نمی‌شود)')) return;
      api('del', '/admin/products/' + id)
        .then(function () { toast('محصول حذف شد'); LOADERS.products(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (btn.id === 'pf-cancel') {
      document.getElementById('productForm').reset();
      document.getElementById('pf-id').value = '';
      document.getElementById('pf-cancel').style.display = 'none';
      document.getElementById('product-form-title').textContent = '➕ محصول جدید';
      return;
    }

    // ---------- آلبوم ----------
    if (act === 'album-up' || act === 'album-down') {
      api('post', '/admin/albums/' + id + '/move', { direction: act === 'album-up' ? 'up' : 'down' })
        .then(function () { LOADERS.albums(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'album-pub') {
      api('patch', '/admin/albums/' + id, { isPublished: btn.getAttribute('data-pub') === 'false' })
        .then(function () { toast('وضعیت انتشار عوض شد'); LOADERS.albums(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'album-del') {
      if (!confirm('آلبوم حذف شود؟')) return;
      api('del', '/admin/albums/' + id)
        .then(function () { toast('آلبوم حذف شد'); LOADERS.albums(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }

    // ---------- کوپن ----------
    if (act === 'codes-gen') {
      var n = prompt('چند کد جدید تولید شود؟', '10');
      if (!n) return;
      api('post', '/admin/coupons/campaigns/' + id + '/codes', { count: parseInt(n, 10) || 10 })
        .then(function (d) { showCodes(d.codes || []); LOADERS.coupons(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'camp-toggle') {
      api('patch', '/admin/coupons/campaigns/' + id, { isActive: btn.getAttribute('data-active') === 'false' })
        .then(function () { toast('کمپین آپدیت شد'); LOADERS.coupons(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'camp-del') {
      if (!confirm('کمپین و همه‌ی کدهایش حذف شود؟')) return;
      api('del', '/admin/coupons/campaigns/' + id)
        .then(function () { toast('کمپین حذف شد'); LOADERS.coupons(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }

    // ---------- پیام‌ها ----------
    if (act === 'msg-read' || act === 'msg-archive') {
      api('patch', '/admin/messages/' + id, { status: act === 'msg-read' ? 'read' : 'archived' })
        .then(function () { LOADERS.messages(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'msg-del') {
      if (!confirm('پیام حذف شود؟')) return;
      api('del', '/admin/messages/' + id)
        .then(function () { toast('حذف شد'); LOADERS.messages(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }

    // ---------- نظرات و سوالات ----------
    if (act === 'rev-ok' || act === 'rev-hide') {
      api('patch', '/admin/reviews/' + id, { isApproved: act === 'rev-ok' })
        .then(function () { toast(act === 'rev-ok' ? 'نظر تایید و منتشر شد ✅' : 'تایید نظر لغو شد'); LOADERS.reviews(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'q-answer') {
      var aInp = document.querySelector('.q-answer-inp[data-id="' + id + '"]');
      var answer = aInp ? aInp.value.trim() : '';
      if (!answer) { toast('پاسخ را بنویس', true); return; }
      api('patch', '/admin/questions/' + id, { answer: answer, isPublished: true })
        .then(function () { toast('پاسخ ثبت و منتشر شد ✅'); LOADERS.reviews(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }
    if (act === 'q-toggle') {
      api('patch', '/admin/questions/' + id, { isPublished: btn.getAttribute('data-pub') === 'false' })
        .then(function () { LOADERS.reviews(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }

    // ---------- کاربران ----------
    if (act === 'user-toggle') {
      if (!confirm('وضعیت کاربر «' + btn.getAttribute('data-email') + '» عوض شود؟')) return;
      api('patch', '/admin/users/' + id, { isActive: btn.getAttribute('data-active') === 'false' })
        .then(function () { toast('کاربر آپدیت شد'); LOADERS.users(); })
        .catch(function (er) { failToast(er, 'خطا'); });
      return;
    }

    // ---------- خروج ----------
    if (btn.id === 'logoutBtn') { logout(); }
  });

  // ==========================================================
  // FORMS
  // ==========================================================
  // محصول (جدید / ویرایش)
  document.getElementById('productForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = document.getElementById('pf-id').value;
    var body = {
      name: document.getElementById('pf-name').value.trim(),
      category: document.getElementById('pf-category').value.trim() || undefined,
      slug: document.getElementById('pf-slug').value.trim().toLowerCase() || undefined,
      price: parseInt(document.getElementById('pf-price').value, 10),
      compareAtPrice: document.getElementById('pf-compare').value ? parseInt(document.getElementById('pf-compare').value, 10) : null,
      stock: parseInt(document.getElementById('pf-stock').value, 10) || 0,
      badge: document.getElementById('pf-badge').value.trim() || null,
      image: document.getElementById('pf-image').value.trim(),
      description: document.getElementById('pf-description').value.trim(),
      isActive: document.getElementById('pf-active').checked,
    };
    var req = id
      ? api('patch', '/admin/products/' + id, body)
      : api('post', '/admin/products', body);
    req.then(function () {
      toast(id ? 'محصول ویرایش شد ✅' : 'محصول ساخته شد ✅');
      document.getElementById('productForm').reset();
      document.getElementById('pf-id').value = '';
      document.getElementById('pf-cancel').style.display = 'none';
      document.getElementById('product-form-title').textContent = '➕ محصول جدید';
      LOADERS.products();
    }).catch(function (er) { failToast(er, 'خطا در ذخیره‌ی محصول'); });
  });

  // آلبوم جدید
  document.getElementById('albumForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var body = {
      title: document.getElementById('af-title').value.trim(),
      titleFa: document.getElementById('af-titlefa').value.trim(),
      year: parseInt(document.getElementById('af-year').value, 10) || 1400,
      genre: document.getElementById('af-genre').value.trim(),
      coverImage: document.getElementById('af-cover').value.trim(),
      description: document.getElementById('af-desc').value.trim(),
      sortOrder: parseInt(document.getElementById('af-sort').value, 10) || 0,
      isPublished: true,
    };
    api('post', '/admin/albums', body).then(function () {
      toast('آلبوم ساخته شد ✅');
      e.target.reset();
      LOADERS.albums();
    }).catch(function (er) { failToast(er, 'خطا در ساخت آلبوم'); });
  });

  // کمپین کوپن جدید
  document.getElementById('campaignForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var exp = document.getElementById('cf-exp').value;
    if (!exp) { toast('تاریخ انقضا را انتخاب کن', true); return; }
    var body = {
      name: document.getElementById('cf-name').value.trim(),
      discountType: document.getElementById('cf-type').value,
      discountValue: parseInt(document.getElementById('cf-value').value, 10),
      expiresAt: exp + 'T23:59:59',
      codeCount: parseInt(document.getElementById('cf-count').value, 10) || 10,
      maxUses: document.getElementById('cf-maxuses').value ? parseInt(document.getElementById('cf-maxuses').value, 10) : null,
      isActive: true,
    };
    api('post', '/admin/coupons/campaigns', body).then(function (d) {
      toast('کمپین ساخته شد — کدها را کپی کن! 🎟️');
      e.target.reset();
      showCodes(d.codes || []);
      LOADERS.coupons();
    }).catch(function (er) { failToast(er, 'خطا در ساخت کمپین'); });
  });

  function showCodes(codes) {
    var box = document.getElementById('coupon-codes');
    var text = document.getElementById('coupon-codes-text');
    if (!codes || !codes.length) return;
    text.textContent = codes.join('\n');
    box.classList.remove('hidden');
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // ==========================================================
  // GATE / MEDIA
  // ==========================================================
  document.getElementById('gateForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    document.getElementById('gateErr').textContent = '';
    window.API.post('/auth/login', {
      email: document.getElementById('gateEmail').value.trim().toLowerCase(),
      password: document.getElementById('gatePass').value,
    }).then(function () {
      toast('خوش برگشتی! 👁️');
      currentUser().then(function (u) {
        if (u && u.role === 'admin') { enterPanel(u); btn.disabled = false; }
        else { enterPanel(u); btn.disabled = false; }
      });
    }).catch(function (er) {
      document.getElementById('gateErr').textContent = errMsg(er, 'ایمیل یا رمز اشتباهه!');
      btn.disabled = false;
    });
  });

  var mediaFile = document.getElementById('media-file');
  mediaFile.addEventListener('change', function () {
    var file = mediaFile.files && mediaFile.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('فقط JPG/PNG/WebP', true); return; }
    if (file.size > 5 * 1024 * 1024) { toast('حداکثر ۵ مگابایت', true); return; }
    var fd = new FormData();
    fd.append('file', file);
    window.API.upload('/admin/upload', fd).then(function (d) {
      var url = d.data.url;
      document.getElementById('media-result').classList.remove('hidden');
      document.getElementById('media-url').textContent = url;
      var prev = document.getElementById('media-preview');
      prev.src = url;
      prev.classList.remove('hidden');
      navigator.clipboard && navigator.clipboard.writeText(url).then(function () { toast('آدرس کپی شد: ' + url); }).catch(function () {});
      toast('آپلود شد ✅');
    }).catch(function (er) { failToast(er, 'خطا در آپلود'); });
    mediaFile.value = '';
  });

  // ==========================================================
  // BOOT
  // ==========================================================
  currentUser().then(enterPanel);
})();

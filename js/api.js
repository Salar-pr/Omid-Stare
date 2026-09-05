// ============================================
// API.JS — کلاینت REST برای بک‌اند Fastify
// همه داده‌ها از سرور میاد؛ localStorage فقط برای ترجیح UI.
// response: { success:true, data, message } | { success:false, error:{code,message,details?} }
// ============================================
(function () {
  var BASE = "/api";

  function toMessage(err, fallback) {
    if (!err) return fallback || "خطای ناشناخته";
    if (err.error && err.error.message) return err.error.message;
    if (err.message) return err.message;
    return fallback || "خطای ناشناخته";
  }

  /**
   * توکن پشتیبان برای محیط‌هایی که کوکی کار نمی‌کند.
   *
   * چرا؟ وقتی سایت داخل iframe یک دامنه‌ی دیگر باز می‌شود (پیش‌نمایش/دمو)،
   * مرورگر ممکن است کوکی سشن را ذخیره نکند (مبدأ مات یا بلاک کوکی third-party).
   * در آن حالت کاربر بعد از ورود دوباره به صفحه‌ی ورود پرت می‌شد.
   * سرور در این محیط‌ها sessionToken را برمی‌گرداند و ما آن را نگه می‌داریم.
   *
   * کوکی همچنان مسیر اصلی است؛ این فقط زمانی استفاده می‌شود که سرور توکن داده باشد.
   */
  /**
   * آیا صفحه در «مبدأ مات» اجرا می‌شود؟ (iframe با sandbox بدون allow-same-origin)
   * نشانه‌اش این است که دسترسی به localStorage با SecurityError رد می‌شود.
   * نتیجه‌ی این تشخیص کش می‌شود چون در طول عمر صفحه تغییر نمی‌کند.
   */
  var _opaque = null;
  function isOpaqueOrigin() {
    if (_opaque !== null) return _opaque;
    try { window.localStorage.getItem("__probe"); _opaque = false; }
    catch (e) { _opaque = true; }
    return _opaque;
  }

  var TOKEN_KEY = "omid_session_token";
  var memToken = null;

  /**
   * در مبدأ مات نه کوکی کار می‌کند نه localStorage، و متغیر حافظه هم با هر
   * ناوبری ریست می‌شود. تنها راهِ باقی‌مانده برای حمل سشن بین صفحه‌ها،
   * قطعه‌ی آدرس (#) است — برخلاف query string در تاریخچه/Referer ثبت نمی‌شود.
   */
  function tokenFromHash() {
    try {
      var m = /(?:^|&)__t=([^&]+)/.exec((window.location.hash || "").slice(1));
      return m ? decodeURIComponent(m[1]) : null;
    } catch (e) { return null; }
  }

  function getToken() {
    if (memToken) return memToken;
    var h = tokenFromHash();
    if (h) { memToken = h; return h; }
    try { return window.localStorage.getItem(TOKEN_KEY) || null; }
    catch (e) { return null; }
  }
  function setToken(t) {
    memToken = t || null;
    try { t ? window.localStorage.setItem(TOKEN_KEY, t) : window.localStorage.removeItem(TOKEN_KEY); }
    catch (e) { /* localStorage غیرفعال — از hash استفاده می‌شود */ }
  }

  /**
   * آدرس مقصد را برای ناوبری داخلی آماده می‌کند: اگر در حالت مات هستیم و
   * توکن داریم، آن را به قطعه‌ی آدرس می‌چسباند تا صفحه‌ی بعد هم سشن داشته باشد.
   * در حالت عادی آدرس دست‌نخورده برمی‌گردد.
   */
  function withSession(href) {
    if (!isOpaqueOrigin()) return href;
    var t = getToken();
    if (!t) return href;
    if (href.indexOf("__t=") !== -1) return href;
    return href + (href.indexOf("#") === -1 ? "#" : "&") + "__t=" + encodeURIComponent(t);
  }

  function request(method, url, body, opts) {
    opts = opts || {};
    var headers = {};
    var payload;
    if (body !== undefined && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    } else if (body instanceof FormData) {
      payload = body;
    }
    var tok = getToken();
    if (tok) headers["Authorization"] = "Bearer " + tok;
    // در «مبدأ مات» (iframe بدون allow-same-origin) مرورگر Origin: null می‌فرستد و
    // سرور نمی‌تواند Allow-Credentials بدهد؛ با credentials:"include" کل درخواست
    // با خطای CORS رد می‌شود. آن‌جا کوکی هم در دسترس نیست، پس omit می‌کنیم و
    // احراز هویت از مسیر Bearer انجام می‌شود.
    return fetch(BASE + url, {
      method: method,
      headers: headers,
      body: payload,
      credentials: isOpaqueOrigin() ? "omit" : "include",
    })
      .then(function (res) {
        return res.text().then(function (text) {
          var data;
          try { data = text ? JSON.parse(text) : {}; }
          catch (e) { data = { success: false, error: { code: "BAD_RESPONSE", message: "پاسخ سرور خوانا نبود." } }; }
          if (!res.ok || data.success === false) {
            var err = {
              code: (data.error && data.error.code) || "ERROR",
              message: toMessage(data, "درخواست انجام نشد."),
              details: data.error && data.error.details,
              status: res.status,
              sentToken: !!tok, // آیا این درخواست توکن Bearer داشت؟
            };
            throw err;
          }
          return data;
        });
      })
      .catch(function (e) {
        if (e && e.code) throw e;
        throw { code: "NETWORK", message: "اتصال به سرور برقرار نشد — اینترنتت رو چک کن.", status: 0 };
      });
  }

  /**
   * پاسخ ورود/ثبت‌نام را می‌گیرد و اگر سرور sessionToken داده بود ذخیره می‌کند.
   * خروج، توکن را پاک می‌کند.
   */
  function handleAuthResponse(url, data) {
    if (/\/auth\/(login|register)$/.test(url)) {
      var t = data && data.data && data.data.sessionToken;
      if (t) setToken(t);
    } else if (/\/auth\/logout$/.test(url)) {
      setToken(null);
    }
    return data;
  }

  window.API = {
    get: function (url) { return request("GET", url); },
    post: function (url, body) {
      return request("POST", url, body).then(function (d) { return handleAuthResponse(url, d); });
    },
    patch: function (url, body) { return request("PATCH", url, body); },
    put: function (url, body) { return request("PUT", url, body); },
    del: function (url) { return request("DELETE", url); },
    upload: function (url, formData) { return request("POST", url, formData); },

    /** {user} یا {user:null} — بدون redirect */
    me: function () {
      return request("GET", "/auth/me").then(
        function (d) { return d.data || null; },
        function (err) {
          // توکن پشتیبان باطل شده؟ پاکش کن تا در حلقه‌ی 401 گیر نکنیم.
          // فقط وقتی توکنی واقعاً فرستاده شده بود — وگرنه 401 طبیعیِ «مهمان»
          // توکن تازه‌ذخیره‌شده را حذف می‌کند.
          if (err && err.status === 401 && err.sentToken) setToken(null);
          return null;
        }
      );
    },

    /** پاک کردن دستی توکن پشتیبان (مثلاً بعد از خروج ناموفق) */
    clearToken: function () { setToken(null); },

    /** آدرس داخلی + سشن (فقط در حالت مبدأ مات چیزی اضافه می‌کند) */
    withSession: withSession,

    /** آیا در iframe با مبدأ مات هستیم؟ */
    isOpaque: isOpaqueOrigin,

    /** a helper برای message فارسی */
    msg: toMessage,
  };

  /**
   * escape متنی که با innerHTML تزریق می‌شود — الزامی برای هر داده‌ای که
   * کاربر/ادمین وارد کرده (نظر، سوال، نام، آدرس...) تا XSS stored ممکن نباشد.
   */
  window.escHtml = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  // فرمت قیمت/عدد فارسی (مجموعه‌ای که همه جا استفاده می‌شه)
  window.fmtNum = function (n) {
    try { return new Intl.NumberFormat("fa-IR").format(Number(n) || 0); }
    catch (e) { return String(n); }
  };
  window.fmtDate = function (iso) {
    try {
      var d = new Date(iso);
      var f = new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium", timeStyle: "short" });
      return f.format(d);
    } catch (e) { return ""; }
  };
  /**
   * حفظ سشن هنگام ناوبری در «مبدأ مات».
   *
   * در آن حالت نه کوکی هست نه localStorage، پس توکن باید با خودِ آدرس منتقل
   * شود. به‌جای دست‌کاری تک‌تک صفحه‌ها، اینجا دو کار انجام می‌دهیم:
   *   ۱) روی هر کلیک لینک داخلی، توکن را به آدرس مقصد می‌چسبانیم.
   *   ۲) location.href / location.replace را می‌پیچیم تا ریدایرکت‌های
   *      برنامه‌ای (مثل رفتن به profile.html بعد از ورود) هم پوشش داده شوند.
   * در حالت عادی هیچ‌کدام فعال نمی‌شود و رفتار سایت دست‌نخورده می‌ماند.
   */
  if (isOpaqueOrigin()) {
    document.addEventListener("click", function (e) {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a) return;
      var href = a.getAttribute("href") || "";
      // فقط لینک‌های داخلی نسبی
      if (/^(https?:|mailto:|tel:|#|javascript:)/i.test(href)) return;
      a.setAttribute("href", withSession(href));
    }, true);

    try {
      var _assign = window.location.assign.bind(window.location);
      var _replace = window.location.replace.bind(window.location);
      window.location.assign = function (u) { return _assign(withSession(String(u))); };
      window.location.replace = function (u) { return _replace(withSession(String(u))); };
    } catch (e) { /* بعضی مرورگرها اجازه نمی‌دهند — لینک‌ها همچنان کار می‌کنند */ }
  }

  window.fmtDuration = function (sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  };
})();

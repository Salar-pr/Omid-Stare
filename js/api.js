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
    return fetch(BASE + url, {
      method: method,
      headers: headers,
      body: payload,
      credentials: "same-origin",
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

  window.API = {
    get: function (url) { return request("GET", url); },
    post: function (url, body) { return request("POST", url, body); },
    patch: function (url, body) { return request("PATCH", url, body); },
    put: function (url, body) { return request("PUT", url, body); },
    del: function (url) { return request("DELETE", url); },
    upload: function (url, formData) { return request("POST", url, formData); },

    /** {user} یا {user:null} — بدون redirect */
    me: function () {
      return request("GET", "/auth/me").then(function (d) { return d.data || null; }, function () { return null; });
    },

    /** a helper برای message فارسی */
    msg: toMessage,
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
  window.fmtDuration = function (sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  };
})();

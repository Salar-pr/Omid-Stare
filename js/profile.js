// PROFILE.JS — پروفایل (داده از /api/users/me)
(function () {
  var fmt = window.fmtNum;
  var user = null;

  API.me().then(function (u) {
    user = u;
    if (!user) { window.location.replace("account.html"); return; }

    document.getElementById("profileName").textContent = user.name;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileUsername").textContent = "@" + user.email.split("@")[0];
    if (user.avatarUrl) document.getElementById("avatarImg").src = user.avatarUrl;

    // اگه مدیر است → کارت پنل ادمین بالای داشبورد
    if (user.role === "admin") {
      var grid = document.querySelector(".dash-grid");
      if (grid) {
        var a = document.createElement("a");
        a.className = "dash-card";
        a.href = "admin.html";
        a.style.borderColor = "rgba(255,45,149,0.35)";
        a.innerHTML =
          '<span class="dash-icon">⚙️</span>' +
          "<h3>پنل ادمین</h3>" +
          "<p>مدیریت محصولات، سفارش‌ها، پیام‌ها، کوپن‌ها و …</p>" +
          '<span class="dash-arrow">← ورود به پنل</span>';
        grid.insertBefore(a, grid.firstChild);
      }
    }

    // آمار + کوپن‌های من
    API.get("/users/me").then(function (d) {
      var me = d.data;
      var c = me.counts || {};
      if (c.orders != null) {
        document.getElementById("statOrders").textContent = fmt(c.orders);
        if (c.orders) document.getElementById("ordersHint").textContent = fmt(c.orders) + " سفر ثبت‌شده";
      }
      if (c.cart_qty != null) {
        document.getElementById("statCart").textContent = fmt(c.cart_qty);
        if (c.cart_qty) document.getElementById("cartHint").textContent = fmt(c.cart_qty) + " آیتم تو ووید";
      }
      if (c.wishlist != null) {
        var wh = document.getElementById("wishHint");
        if (wh && c.wishlist) wh.textContent = fmt(c.wishlist) + " آیتم تو ویش‌لیست ♡";
      }
      if (c.active_coupons) {
        var el = document.getElementById("couponHint");
        if (el) el.textContent = fmt(c.active_coupons) + " کد تخفیف فعال 🎟️";
      }
    }).catch(function () {});

    document.getElementById("logoutBtn").addEventListener("click", function () {
      API.post("/auth/logout")
        .catch(function () {})
        .finally(function () {
          if (window.showToast) window.showToast("از ووید خارج شدی. پرتال همیشه بازه 🌀");
          setTimeout(function () { window.location.href = "account.html"; }, 700);
        });
    });
  });
})();

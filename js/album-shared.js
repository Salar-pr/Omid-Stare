// ALBUM-SHARED.JS — منطق مشترک بین albums.html و album.html
(function () {
  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\u200c\s\-—_.]/g, "");
  }

  // محصول مرتبط با آلبوم را از روی نام پیدا می‌کند (وینیل/CD همان آلبوم)
  function matchProduct(album, products) {
    var t = norm(album.title), tf = norm(album.titleFa);
    var best = null;
    (products || []).forEach(function (p) {
      var hay = norm(p.name) + "|" + norm(p.nameEn) + "|" + norm(p.slug);
      var hit = (t && hay.indexOf(t) > -1) || (tf && hay.indexOf(tf) > -1);
      if (!hit) return;
      if (!best) { best = p; return; }
      var isVinyl = /وینیل|vinyl|cd|آلبوم/i.test(p.category + " " + p.name);
      var bestVinyl = /وینیل|vinyl|cd|آلبوم/i.test(best.category + " " + best.name);
      if (isVinyl && !bestVinyl) best = p;
    });
    return best;
  }

  function durLabel(sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function totalDuration(tracks) {
    var t = (tracks || []).reduce(function (s, x) { return s + (Number(x.duration) || 0); }, 0);
    var h = Math.floor(t / 3600), m = Math.round((t % 3600) / 60);
    return h ? h + " ساعت و " + m + " دقیقه" : m + " دقیقه";
  }

  function needAuth(msg) {
    if (window.showToast) window.showToast(msg, true);
    setTimeout(function () { window.location.href = "account.html"; }, 1200);
  }

  // نوار خرید افقی (زیر کارت آلبوم / زیر هدر صفحه‌ی جزئیات)
  function buyBarHtml(product, opts) {
    opts = opts || {};
    var fmt = window.fmtNum || function (n) { return n; };
    if (!product) {
      return '<div class="album-buybar empty">' +
        '<div class="bb-left"><span class="bb-label">نسخه فیزیکی</span><b class="bb-soon">به‌زودی توی فروشگاه 🌀</b></div>' +
        '<a class="btn btn-ghost bb-shop" href="shop.html">دیدن فروشگاه</a>' +
        "</div>";
    }
    var out = product.stock === 0;
    return '<div class="album-buybar" data-pid="' + product.id + '">' +
      '<div class="bb-left">' +
      '<img class="bb-thumb" src="' + product.image + '" alt="" loading="lazy">' +
      '<div class="bb-txt"><b class="bb-name">' + escHtml(product.name) + "</b>" +
      '<span class="bb-stock ' + (out ? "out" : (product.stock < 6 ? "low" : "")) + '">' +
      (out ? "ناموجود" : (product.stock < 6 ? "تنها " + fmt(product.stock) + " عدد" : "موجود در انبار")) +
      "</span></div></div>" +
      '<div class="bb-price">' +
      (product.compareAtPrice ? '<span class="bb-old">' + fmt(product.compareAtPrice) + "</span>" : "") +
      fmt(product.price) + " <small>تومان</small></div>" +
      '<div class="bb-qty"><button type="button" class="bb-minus" aria-label="کم">−</button><span class="bb-q" data-v="1">1</span><button type="button" class="bb-plus" aria-label="زیاد">+</button></div>' +
      '<button class="btn btn-primary bb-add" type="button"' + (out ? " disabled" : "") + ">" +
      (out ? "ناموجود" : "افزودن به سبد 🛒") + "</button>" +
      '<a class="bb-link" href="product.html?slug=' + encodeURIComponent(product.slug) + '">جزئیات محصول ←</a>' +
      "</div>";
  }

  // هندلر مشترک کلیک روی نوار خرید (delegation)
  function bindBuyBar(root, ctx) {
    root.addEventListener("click", function (e) {
      var bar = e.target.closest(".album-buybar");
      if (!bar) return;
      var qEl = bar.querySelector(".bb-q");

      if (e.target.closest(".bb-plus") || e.target.closest(".bb-minus")) {
        e.preventDefault(); e.stopPropagation();
        var q = parseInt(qEl.dataset.v || "1", 10) || 1;
        q += e.target.closest(".bb-plus") ? 1 : -1;
        if (q < 1) q = 1;
        if (q > 99) q = 99;
        qEl.dataset.v = q;
        qEl.textContent = (window.fmtNum || String)(q);
        return;
      }

      if (e.target.closest(".bb-link")) { e.stopPropagation(); return; }

      var addBtn = e.target.closest(".bb-add");
      if (!addBtn || addBtn.disabled) return;
      e.preventDefault(); e.stopPropagation();

      if (!ctx.getUser()) { needAuth("برای خرید وارد حسابت شو 🌀"); return; }

      var pid = bar.getAttribute("data-pid");
      var qty = parseInt(qEl.dataset.v || "1", 10) || 1;
      var orig = addBtn.textContent;
      addBtn.disabled = true;
      API.post("/cart/items", { productId: pid, quantity: qty })
        .then(function (d) {
          if (ctx.onCart) ctx.onCart(d.data.count);
          addBtn.textContent = "✓ اضافه شد";
          addBtn.classList.add("added");
          if (window.showToast) window.showToast("به سبد اضافه شد 🛒");
          setTimeout(function () {
            addBtn.textContent = orig;
            addBtn.classList.remove("added");
            addBtn.disabled = false;
          }, 1400);
        })
        .catch(function (err) {
          addBtn.disabled = false;
          if (window.showToast) window.showToast(API.msg(err, "افزودن به سبد ناموفق بود"), true);
        });
    });
  }

  window.AlbumKit = {
    matchProduct: matchProduct,
    durLabel: durLabel,
    totalDuration: totalDuration,
    buyBarHtml: buyBarHtml,
    bindBuyBar: bindBuyBar,
    needAuth: needAuth,
  };
})();

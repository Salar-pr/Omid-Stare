// ALBUMS.JS — آلبوم‌ها از API (دیسک + tracklist واقعی) + ریل خرید سمت چپ کارت
(function () {
  var grid = document.getElementById("albums");
  if (!grid) return;

  var fmt = window.fmtNum || function (n) { return n; };
  var user = null;
  var productsByAlbum = {};   // albumId -> product
  var cartCount = 0;

  function durLabel(sec) {
    sec = Number(sec) || 0;
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[\u200c\s\-—_.]/g, "");
  }

  // محصول مرتبط با آلبوم را از روی نام پیدا می‌کند (وینیل/CD همان آلبوم)
  function matchProduct(album, products) {
    var t = norm(album.title), tf = norm(album.titleFa);
    var best = null;
    products.forEach(function (p) {
      var hay = norm(p.name) + "|" + norm(p.nameEn) + "|" + norm(p.slug);
      var hit = (t && hay.indexOf(t) > -1) || (tf && hay.indexOf(tf) > -1);
      if (!hit) return;
      if (!best) { best = p; return; }
      // اولویت با دسته‌ی وینیل/موسیقی
      var isVinyl = /وینیل|vinyl|cd|آلبوم/i.test(p.category + " " + p.name);
      var bestVinyl = /وینیل|vinyl|cd|آلبوم/i.test(best.category + " " + best.name);
      if (isVinyl && !bestVinyl) best = p;
    });
    return best;
  }

  function buyRail(album) {
    var p = productsByAlbum[album.id];
    if (!p) {
      return '<aside class="album-buy">' +
        '<div class="ab-title">نسخه فیزیکی</div>' +
        '<div class="ab-soon">به‌زودی 🌀</div>' +
        '</aside>';
    }
    var out = p.stock === 0;
    return '<aside class="album-buy" data-pid="' + p.id + '">' +
      '<div class="ab-title">' + escHtml(p.name) + '</div>' +
      '<div class="ab-price">' +
      (p.compareAtPrice ? '<span class="ab-old">' + fmt(p.compareAtPrice) + '</span>' : '') +
      fmt(p.price) + ' <small>تومان</small></div>' +
      '<div class="ab-stock ' + (out ? 'out' : (p.stock < 6 ? 'low' : '')) + '">' +
      (out ? 'ناموجود' : (p.stock < 6 ? 'تنها ' + fmt(p.stock) + ' عدد' : 'موجود')) + '</div>' +
      '<div class="ab-qty"><button type="button" class="ab-minus">−</button><span class="ab-q">1</span><button type="button" class="ab-plus">+</button></div>' +
      '<button class="btn btn-primary ab-add" type="button"' + (out ? ' disabled' : '') + '>' +
      (out ? 'ناموجود' : 'افزودن به سبد 🛒') + '</button>' +
      '<a class="ab-link" href="product.html?slug=' + encodeURIComponent(p.slug) + '">جزئیات محصول ←</a>' +
      '</aside>';
  }

  function cardHtml(a) {
    var tracksHtml = (a.tracks || []).map(function (t) {
      return '<div class="track"><span class="num">' + t.trackNumber + "</span><b>" + escHtml(t.title) + "</b><small>" + durLabel(t.duration) + "</small></div>";
    }).join("");
    return '<div class="album-card rv" data-album="' + a.id + '">' +
      buyRail(a) +
      '<div class="album-main">' +
      '<div class="cover"><div class="vinyl"><div class="vinyl-label"><img loading="lazy" src="' + a.coverImage + '" alt="' + escHtml(a.title) + '" /></div></div></div>' +
      '<div class="album-info">' +
      "<h3>" + escHtml(a.title) + (a.titleFa ? ' <small style="color:#a9a39a; font-weight:400;">— ' + escHtml(a.titleFa) + "</small>" : "") + "</h3>" +
      '<div class="album-meta">' + (a.year || "") + " • " + (a.genre || "") + " • " + (a.trackCount != null ? a.trackCount : (a.tracks || []).length) + " TRACKS</div>" +
      (a.description ? '<p class="album-desc">' + escHtml(a.description) + "</p>" : "") +
      '<div class="tracklist">' + tracksHtml + "</div>" +
      "</div></div></div>";
  }

  function updateBadge(n) {
    cartCount = n;
    var b = document.getElementById("albumsCartCount");
    if (b) { b.textContent = fmt(n); b.classList.toggle("show", n > 0); }
  }

  function needAuth(msg) {
    if (window.showToast) window.showToast(msg, true);
    setTimeout(function () { window.location.href = "account.html"; }, 1200);
  }

  // ---------- تعامل ریل خرید ----------
  grid.addEventListener("click", function (e) {
    var rail = e.target.closest(".album-buy");
    if (!rail) return;
    var qEl = rail.querySelector(".ab-q");

    if (e.target.closest(".ab-plus") || e.target.closest(".ab-minus")) {
      var q = parseInt(qEl.textContent, 10) || 1;
      q += e.target.closest(".ab-plus") ? 1 : -1;
      if (q < 1) q = 1;
      if (q > 99) q = 99;
      qEl.textContent = fmt(q);
      qEl.dataset.v = q;
      return;
    }

    var addBtn = e.target.closest(".ab-add");
    if (!addBtn || addBtn.disabled) return;
    if (!user) { needAuth("برای خرید وارد حسابت شو 🌀"); return; }

    var pid = rail.getAttribute("data-pid");
    var qty = parseInt(qEl.dataset.v || "1", 10) || 1;
    addBtn.disabled = true;
    var orig = addBtn.textContent;
    API.post("/cart/items", { productId: pid, quantity: qty })
      .then(function (d) {
        updateBadge(d.data.count);
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

  // ---------- لود داده ----------
  Promise.all([
    API.get("/albums"),
    API.get("/products?limit=60").catch(function () { return { data: { items: [] } }; }),
  ])
    .then(function (res) {
      var items = (res[0].data.items) || [];
      var products = (res[1].data && res[1].data.items) || [];

      items.forEach(function (a) {
        var p = matchProduct(a, products);
        if (p) productsByAlbum[a.id] = p;
      });

      if (!items.length) {
        grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#a9a39a; padding:40px;">هنوز آلبومی منتشر نشده 🌀</p>';
        return;
      }
      grid.innerHTML = items.map(cardHtml).join("");

      API.me().then(function (u) {
        user = u;
        if (!user) return;
        API.get("/cart").then(function (d) { updateBadge(d.data.count); }, function () {});
      }, function () {});
    })
    .catch(function (err) {
      grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#ff2d95; padding:40px;">' + API.msg(err, "خطا در بارگذاری آلبوم‌ها") + "</p>";
    });
})();

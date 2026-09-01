// SHOP.JS — فروشگاه (داده‌ها از API: جستجو/فیلتر/سورت سمت سرور)
(function () {
  var cartBtn = document.getElementById("cartBtn");
  var cartCount = document.getElementById("cartCount");
  var wishlistBtn = document.getElementById("wishlistBtn");
  var wishlistCount = document.getElementById("wishlistCount");
  var grid = document.getElementById("productsGrid");
  var productCountEl = document.getElementById("productCount");
  var searchInput = document.getElementById("searchInput");
  var sortSelect = document.getElementById("sortSelect");
  var priceRange = document.getElementById("priceRange");
  var priceRangeVal = document.getElementById("priceRangeVal");
  var loadMoreBtn = document.getElementById("loadMoreBtn");
  var inStockEl = document.getElementById("inStockOnly");

  var fmt = window.fmtNum ? function (n) { return fmtNum(n); } : function (n) { return n; };

  var MAX_PRICE_DEFAULT = 4000000;
  var state = {
    cats: [],
    maxPrice: MAX_PRICE_DEFAULT,
    sizes: [],
    colors: [],
    inStockOnly: false,
    search: "",
    sort: "featured",
    page: 1,
    totalPages: 1,
  };
  var user = null;
  var wishlistIds = [];
  var searchTimer = null;
  var loading = false;

  // ---------- session (از API) ----------
  function needAuth(msg) {
    if (window.showToast) window.showToast(msg, true);
    setTimeout(function () { window.location.href = "account.html"; }, 1200);
    return false;
  }

  API.me().then(function (u) {
    user = u;
    if (user) {
      API.get("/cart").then(function (d) { updateCartBadge(d.data.count); }, function () {});
      API.get("/wishlist").then(function (d) {
        wishlistIds = (d.data.items || []).map(function (x) { return x.product.id; });
        updateWishBadge(wishlistIds.length);
        render(true);
      }, function () { render(true); });
    } else {
      render(true);
    }
  });

  function updateCartBadge(n) {
    if (cartCount) { cartCount.textContent = fmt(n); cartCount.classList.toggle("show", n > 0); }
  }
  function updateWishBadge(n) {
    if (wishlistCount) { wishlistCount.textContent = fmt(n); wishlistCount.classList.toggle("show", n > 0); }
  }
  function bumpCart() {
    if (cartBtn) {
      cartBtn.classList.remove("bump"); void cartBtn.offsetWidth;
      cartBtn.classList.add("bump");
      cartBtn.style.boxShadow = "0 0 28px rgba(255,45,149,0.45)";
      setTimeout(function () { cartBtn.style.boxShadow = ""; }, 600);
    }
  }

  if (cartBtn) cartBtn.addEventListener("click", function () { window.location.href = "cart.html"; });
  if (wishlistBtn) wishlistBtn.addEventListener("click", function () {
    if (!user) { needAuth("برای ویش‌لیست وارد شو 🌀"); return; }
    window.location.href = "wishlist.html";
  });

  // ---------- query از state ----------
  function buildQuery() {
    var q = new URLSearchParams();
    if (state.search) q.set("search", state.search);
    if (state.cats.length) q.set("categories", state.cats.join(","));
    if (state.maxPrice < MAX_PRICE_DEFAULT) q.set("maxPrice", String(state.maxPrice));
    if (state.sizes.length) q.set("sizes", state.sizes.join(","));
    if (state.colors.length) q.set("colors", state.colors.join(","));
    if (state.inStockOnly) q.set("inStock", "1");
    if (state.sort && state.sort !== "featured") q.set("sort", state.sort);
    q.set("page", String(state.page));
    q.set("limit", "24");
    return q.toString();
  }

  // ---------- render ----------
  function render(isFirst) {
    if (loading) return;
    loading = true;
    if (isFirst && grid) grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#a9a39a; padding:30px;">در حال لود از سرور...</p>';

    API.get("/products?" + buildQuery())
      .then(function (d) {
        var items = d.data.items || [];
        state.totalPages = d.data.pagination.totalPages || 1;
        if (isFirst) {
          if (productCountEl) productCountEl.textContent = fmt(d.data.pagination.total);
          grid.innerHTML = "";
        }
        items.forEach(function (p) { appendCard(p); });
        if (!items.length && isFirst) {
          var empty = document.createElement("div");
          empty.style.gridColumn = "1/-1"; empty.style.textAlign = "center"; empty.style.padding = "30px"; empty.style.color = "#a9a39a";
          empty.innerHTML = "محصولی با این فیلتر پیدا نشد 🌀<br><button class='btn btn-ghost' id='resetEmpty' style='margin-top:12px;'>پاک کردن فیلترها</button>";
          grid.appendChild(empty);
          var re = document.getElementById("resetEmpty");
          if (re) re.addEventListener("click", clearAll);
        }
        if (loadMoreBtn) loadMoreBtn.style.display = state.page < state.totalPages ? "block" : "none";
      })
      .catch(function (err) {
        if (grid) grid.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:#ff2d95; padding:30px;">' + API.msg(err, "خطا در بارگذاری محصولات") + "</p>";
      })
      .finally(function () { loading = false; });
  }

  function appendCard(p) {
    var isWish = wishlistIds.indexOf(p.id) > -1;
    var stockClass = p.stock === 0 ? "out" : (p.stock < 6 ? "low" : "");
    var stockText = p.stock === 0 ? "ناموجود" : (p.stock < 6 ? "تنها " + fmt(p.stock) + " عدد" : "موجود");
    var r = Math.round(p.rating || 0);
    var stars = "★".repeat(r) + "☆".repeat(5 - r);
    var desc = (p.description || "").split(/[.。]/)[0] || "";

    var card = document.createElement("div");
    card.className = "product-card";
    card.dataset.id = p.id;
    card.innerHTML =
      '<span class="badge">' + (p.badge || "") + '</span>' +
      '<button class="wishlist-btn ' + (isWish ? "active" : "") + '" data-wish="' + p.id + '" type="button">' + (isWish ? "♥" : "♡") + '</button>' +
      '<div class="thumb"><img loading="lazy" src="' + p.image + '" alt="' + p.name + '"></div>' +
      '<h3>' + p.name + '</h3>' +
      '<div class="product-meta"><span class="stars">' + stars + '</span><span>(' + fmt(p.reviewsCount) + ')</span><span class="stock ' + stockClass + '">' + stockText + '</span></div>' +
      '<p class="desc">' + desc + '</p>' +
      '<div class="row">' +
      '<div class="price">' + (p.compareAtPrice ? '<span class="old-price">' + fmt(p.compareAtPrice) + '</span>' : '') + fmt(p.price) + ' <small>تومان</small></div>' +
      '<button class="add-btn" type="button" ' + (p.stock === 0 ? "disabled" : "") + '>' + (p.stock === 0 ? "ناموجود" : "افزودن") + '</button>' +
      '</div>';

    card.addEventListener("click", function (e) {
      if (e.target.closest(".add-btn") || e.target.closest(".wishlist-btn")) return;
      localStorage.setItem("or_last_product", p.slug);
      window.location.href = "product.html?slug=" + p.slug;
    });

    var wb = card.querySelector(".wishlist-btn");
    wb.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!user) { needAuth("برای ویش‌لیست وارد شو 🌀"); return; }
      toggleWish(p.id, wb);
    });

    var ab = card.querySelector(".add-btn");
    ab.addEventListener("click", function (e) {
      e.stopPropagation();
      if (!user) { needAuth("برای خرید وارد حسابت شو 🌀"); return; }
      if (ab.classList.contains("added")) return;
      var img = card.querySelector(".thumb img");
      addToCartFly(p, img);
    });

    grid.appendChild(card);
  }

  // ---------- افزودن به سبد با انیمیشن پرواز ----------
  function addToCartFly(p, img) {
    var btn = document.querySelector('.add-btn[data-for]');
    var defaultSize = p.sizes && p.sizes.length ? p.sizes[0] : null;
    var defaultColor = p.colors && p.colors.length ? p.colors[0].name : null;
    API.post("/cart/items", { productId: p.id, quantity: 1, selectedSize: defaultSize, selectedColor: defaultColor })
      .then(function (d) {
        updateCartBadge(d.data.count);
        bumpCart();
        var cards = document.querySelectorAll('.product-card[data-id="' + p.id + '"] .add-btn');
        cards.forEach(function (b) {
          if (b.classList.contains("added")) return;
          var orig = b.textContent;
          b.classList.add("added"); b.textContent = "✓ اضافه شد";
          setTimeout(function () { b.classList.remove("added"); b.textContent = orig; }, 1200);
        });
        // انیمیشن پرواز تصویر به سبد
        if (img && cartBtn) {
          var from = img.getBoundingClientRect();
          var to = cartBtn.getBoundingClientRect();
          var fly = img.cloneNode(true);
          fly.className = "fly-img";
          fly.style.top = from.top + "px"; fly.style.left = from.left + "px";
          fly.style.width = from.width + "px"; fly.style.height = from.height + "px";
          fly.style.opacity = "0.92";
          document.body.appendChild(fly);
          void fly.offsetWidth;
          var dx = to.left + to.width / 2 - (from.left + from.width / 2);
          var dy = to.top + to.height / 2 - (from.top + from.height / 2);
          fly.style.transform = "translate(" + dx + "px," + dy + "px) scale(0.18) rotate(10deg)";
          fly.style.opacity = "0.12";
          var done = false;
          function onEnd(ev) { if (done) return; if (ev.propertyName !== "transform") return; done = true; fly.remove(); }
          fly.addEventListener("transitionend", onEnd);
          setTimeout(function () { if (!done) onEnd({ propertyName: "transform" }); }, 1500);
        }
      })
      .catch(function (err) {
        if (window.showToast) window.showToast(API.msg(err), true);
      });
  }

  // ---------- ویش‌لیست toggle ----------
  function toggleWish(pid, btn) {
    var exists = wishlistIds.indexOf(pid) > -1;
    var req = exists ? API.del("/wishlist/" + pid) : API.post("/wishlist/" + pid);
    req.then(function (d) {
      if (exists) {
        wishlistIds = wishlistIds.filter(function (x) { return x !== pid; });
        if (btn) { btn.classList.remove("active"); btn.textContent = "♡"; }
        window.showToast && window.showToast("از ویش‌لیست حذف شد");
      } else {
        wishlistIds.push(pid);
        if (btn) { btn.classList.add("active"); btn.textContent = "♥"; }
        window.showToast && window.showToast("به ویش‌لیست اضافه شد ♡");
      }
      updateWishBadge(wishlistIds.length);
    }).catch(function (err) {
      if (window.showToast) window.showToast(API.msg(err), true);
    });
  }

  // ---------- فیلترها ----------
  function clearAll() {
    state.cats = [];
    state.maxPrice = MAX_PRICE_DEFAULT;
    state.sizes = [];
    state.colors = [];
    state.inStockOnly = false;
    state.search = "";
    state.page = 1;
    if (searchInput) searchInput.value = "";
    if (priceRange) { priceRange.value = MAX_PRICE_DEFAULT; priceRange.min = "0"; priceRange.max = String(MAX_PRICE_DEFAULT); }
    if (priceRangeVal) priceRangeVal.textContent = fmt(MAX_PRICE_DEFAULT);
    if (inStockEl) inStockEl.checked = false;
    document.querySelectorAll(".filter-cat").forEach(function (c) { c.checked = c.value === "همه"; });
    document.querySelectorAll(".size-chip").forEach(function (c) { c.classList.remove("active"); });
    document.querySelectorAll(".color-dot").forEach(function (c) { c.classList.remove("active"); });
    render(true);
  }

  document.querySelectorAll(".filter-cat").forEach(function (ch) {
    ch.addEventListener("change", function () {
      if (ch.value === "همه" && ch.checked) {
        document.querySelectorAll(".filter-cat").forEach(function (o) { if (o !== ch) o.checked = false; });
        state.cats = [];
      } else {
        var all = document.querySelector('.filter-cat[value="همه"]');
        if (all) all.checked = false;
        if (ch.checked) { if (state.cats.indexOf(ch.value) === -1) state.cats.push(ch.value); }
        else state.cats = state.cats.filter(function (c) { return c !== ch.value; });
        if (!state.cats.length && all) all.checked = true;
      }
      state.page = 1;
      render(true);
    });
  });

  if (priceRange) {
    priceRange.addEventListener("input", function () {
      state.maxPrice = parseInt(priceRange.value, 10);
      if (priceRangeVal) priceRangeVal.textContent = fmt(state.maxPrice);
      state.page = 1;
      render(true);
    });
  }

  document.querySelectorAll(".size-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      chip.classList.toggle("active");
      var s = chip.dataset.size;
      if (chip.classList.contains("active")) { if (state.sizes.indexOf(s) === -1) state.sizes.push(s); }
      else state.sizes = state.sizes.filter(function (x) { return x !== s; });
      state.page = 1;
      render(true);
    });
  });

  document.querySelectorAll(".color-dot").forEach(function (dot) {
    dot.addEventListener("click", function () {
      dot.classList.toggle("active");
      var c = dot.dataset.color;
      if (dot.classList.contains("active")) { if (state.colors.indexOf(c) === -1) state.colors.push(c); }
      else state.colors = state.colors.filter(function (x) { return x !== c; });
      state.page = 1;
      render(true);
    });
  });

  if (inStockEl) inStockEl.addEventListener("change", function () {
    state.inStockOnly = inStockEl.checked;
    state.page = 1;
    render(true);
  });

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.search = searchInput.value.trim();
        state.page = 1;
        render(true);
      }, 350);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      state.sort = sortSelect.value;
      state.page = 1;
      render(true);
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", function () {
      state.page += 1;
      render(false);
    });
  }

  var clearBtn = document.getElementById("clearFilters");
  if (clearBtn) clearBtn.addEventListener("click", clearAll);

  // مودال راهنمای سایز
  var guideLink = document.getElementById("sizeGuideLink");
  var guideModal = document.getElementById("sizeGuideModal");
  var guideClose = document.getElementById("sizeGuideClose");
  if (guideLink && guideModal) {
    guideLink.addEventListener("click", function (e) { e.preventDefault(); guideModal.style.display = "flex"; });
    guideClose.addEventListener("click", function () { guideModal.style.display = "none"; });
    guideModal.addEventListener("click", function (e) { if (e.target === guideModal) guideModal.style.display = "none"; });
  }
})();

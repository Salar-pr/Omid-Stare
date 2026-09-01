// PRODUCT.JS — صفحه جزئیات محصول (داده از API + نظرات/Q&A واقعی)
(function () {
  var fmt = window.fmtNum;
  var user = null;
  var product = null;

  function needAuth(msg) {
    if (window.showToast) window.showToast(msg, true);
    setTimeout(function () { window.location.href = "account.html"; }, 1200);
    return false;
  }

  API.me().then(function (u) {
    user = u;
    loadProduct();
  });

  function loadProduct() {
    var params = new URLSearchParams(window.location.search);
    var ref = params.get("slug") || params.get("id") || localStorage.getItem("or_last_product") || "";
    var root = document.getElementById("pdRoot");
    if (!ref) {
      root.innerHTML = '<p style="padding:40px; text-align:center; color:#a9a39a;">محصول پیدا نشد 🌀</p>';
      return;
    }
    API.get("/products/" + encodeURIComponent(ref))
      .then(function (d) { product = d.data; renderPage(); })
      .catch(function (err) {
        root.innerHTML = '<p style="padding:40px; text-align:center; color:#ff2d95;">' + API.msg(err) + "</p>";
      });
  }

  function renderPage() {
    var p = product;
    document.getElementById("bcName").textContent = p.name;
    document.title = p.name + " — OMID RASTAR";
    var root = document.getElementById("pdRoot");

    var stockClass = p.stock === 0 ? "out" : (p.stock < 6 ? "low" : "");
    var stockText = p.stock === 0 ? "ناموجود" : (p.stock < 6 ? "تنها " + fmt(p.stock) + " عدد در انبار باقیست!" : "موجود در انبار");
    var r = Math.round(p.rating || 0);
    var stars = "★".repeat(r) + "☆".repeat(5 - r);

    var gallery = p.gallery && p.gallery.length ? p.gallery : [p.image].filter(Boolean);

    var galleryHtml = '<div class="gallery"><div class="main-thumb"><img id="mainImg" src="' + gallery[0] + '" alt="' + escHtml(p.name) + '"></div><div class="thumbs" id="thumbs">';
    gallery.forEach(function (src, i) {
      galleryHtml += '<img src="' + src + '" data-src="' + src + '" class="' + (i === 0 ? "active" : "") + '" alt="">';
    });
    galleryHtml += "</div></div>";

    var colorsHtml = '<div class="color-select">';
    (p.colors || []).forEach(function (c, i) {
      colorsHtml += '<button class="color-opt ' + (i === 0 ? "active" : "") + '" data-color="' + escHtml(c.name) + '" style="background:' + escHtml(c.hex) + '" title="' + escHtml(c.name) + '"></button>';
    });
    colorsHtml += "</div>";

    var sizesHtml = '<div class="size-select">';
    (p.sizes || []).forEach(function (s, i) {
      sizesHtml += '<button class="size-opt ' + (i === 0 ? "active" : "") + '" data-size="' + s + '">' + s + "</button>";
    });
    sizesHtml += "</div>";

    var specsHtml = '<table class="specs-table">';
    (p.specs || []).forEach(function (row) {
      specsHtml += "<tr><td>" + escHtml(row[0]) + "</td><td>" + escHtml(row[1]) + "</td></tr>";
    });
    specsHtml += "</table>";

    var featuresHtml = '<div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">';
    (p.features || []).forEach(function (f) {
      featuresHtml += '<span class="stock" style="border-color:rgba(255,255,255,0.12); background:rgba(255,255,255,0.04);">' + escHtml(f) + "</span>";
    });
    featuresHtml += "</div>";

    root.innerHTML =
      galleryHtml +
      '<div class="pd-info">' +
      '<span class="pd-badge">' + escHtml(p.badge || "") + '</span>' +
      '<h1 class="pd-title">' + escHtml(p.name) + '</h1>' +
      (p.nameEn ? '<div class="pd-en">' + escHtml(p.nameEn) + "</div>" : "") +
      '<div class="pd-rating"><span class="stars">' + stars + '</span><span>' + (p.rating ? (Math.round(p.rating * 10) / 10) : "–") + '</span><span style="color:#7a7570;">(' + fmt(p.reviewsCount) + ' نظر)</span><a href="#reviews" style="color:var(--cyan); font-size:0.78rem; margin-right:8px;">دیدن نظرات ←</a></div>' +
      '<div class="pd-price-box">' +
      '<div><span class="pd-old">' + (p.compareAtPrice ? fmt(p.compareAtPrice) : "") + '</span><span class="pd-price">' + fmt(p.price) + " تومان</span></div>" +
      '<div class="stock ' + stockClass + '" style="margin-top:10px;">' + stockText + "</div>" +
      featuresHtml +
      "</div>" +
      (p.colors && p.colors.length ? '<div><label style="font-size:0.76rem; letter-spacing:1px; color:#c9c2b5;">رنگ</label>' + colorsHtml + "</div>" : "") +
      (p.sizes && p.sizes.length ? '<div><label style="font-size:0.76rem; letter-spacing:1px; color:#c9c2b5;">سایز <a href="#" id="sizeGuideLink2" style="color:var(--cyan); font-size:0.7rem;">راهنمای سایز</a></label>' + sizesHtml + "</div>" : "") +
      '<div class="pd-actions">' +
      '<button class="btn btn-primary" id="addToCartBtn" type="button" ' + (p.stock === 0 ? "disabled" : "") + ' style="flex:1;">' + (p.stock === 0 ? "ناموجود" : "افزودن به سبد 🛒") + "</button>" +
      '<button class="btn btn-ghost" id="wishBtn" type="button" style="padding:12px 16px;">♡</button>' +
      "</div>" +
      '<div class="tabs" dir="ltr"><button class="tab-btn active" data-tab="specs">SPECIFICATIONS</button><button class="tab-btn" data-tab="reviews">REVIEWS</button><button class="tab-btn" data-tab="qa">Q&A</button><button class="tab-btn" data-tab="related">RELATED</button></div>' +
      '<div class="tab-panel active" id="tab-specs"><h4 style="margin-bottom:8px;">مشخصات فنی</h4>' + specsHtml + "</div>" +
      '<div class="tab-panel" id="tab-reviews"><div id="reviewsBox"><p style="color:#a9a39a;">در حال لود...</p></div><div id="reviewFormWrap"></div></div>' +
      '<div class="tab-panel" id="tab-qa"><div id="qaBox"><p style="color:#a9a39a;">در حال لود...</p></div><div id="qaFormWrap"></div></div>' +
      '<div class="tab-panel" id="tab-related"><div class="related-grid" id="relatedGrid"></div></div>' +
      "</div>";

    // گالری
    var mainImg = document.getElementById("mainImg");
    document.querySelectorAll(".thumbs img").forEach(function (t) {
      t.addEventListener("click", function () {
        document.querySelectorAll(".thumbs img").forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
        mainImg.src = t.dataset.src;
      });
    });

    // تب‌ها
    document.querySelectorAll(".tab-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        document.querySelectorAll(".tab-btn").forEach(function (x) { x.classList.remove("active"); });
        document.querySelectorAll(".tab-panel").forEach(function (x) { x.classList.remove("active"); });
        btn.classList.add("active");
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
      });
    });

    // ویش‌لیست
    var wishBtn = document.getElementById("wishBtn");
    var isWish = false;
    if (user) {
      API.get("/wishlist").then(function (d) {
        // آیتم‌های ویش‌لیست flat هستند: {id, name, ...}
        isWish = (d.data.items || []).some(function (x) { return x.id === p.id; });
        wishBtn.textContent = isWish ? "♥" : "♡";
        wishBtn.classList.toggle("active", isWish);
      }, function () {});
    }
    wishBtn.addEventListener("click", function () {
      if (!user) { needAuth("برای ویش‌لیست وارد شو 🌀"); return; }
      var req = isWish ? API.del("/wishlist/" + p.id) : API.post("/wishlist/" + p.id);
      req.then(function (d) {
        isWish = !isWish;
        wishBtn.textContent = isWish ? "♥" : "♡";
        wishBtn.classList.toggle("active", isWish);
        window.showToast && window.showToast(isWish ? "به ویش‌لیست اضافه شد ♡" : "از ویش‌لیست حذف شد");
      }).catch(function (err) {
        window.showToast && window.showToast(API.msg(err), true);
      });
    });

    // افزودن به سبد
    document.getElementById("addToCartBtn").addEventListener("click", function () {
      if (!user) { needAuth("برای خرید وارد حسابت شو 🌀"); return; }
      var sizeEl = document.querySelector(".size-opt.active");
      var colorEl = document.querySelector(".color-opt.active");
      API.post("/cart/items", {
        productId: p.id,
        quantity: 1,
        selectedSize: sizeEl ? sizeEl.dataset.size : null,
        selectedColor: colorEl ? colorEl.dataset.color : null,
      })
        .then(function () {
          window.showToast("به سبد اضافه شد — میری سبد 🛒");
          setTimeout(function () { window.location.href = "cart.html"; }, 900);
        })
        .catch(function (err) {
          window.showToast && window.showToast(API.msg(err), true);
        });
    });

    // related
    var rg = document.getElementById("relatedGrid");
    (p.related || []).forEach(function (rp) {
      var rc = document.createElement("div");
      rc.className = "related-card";
      rc.innerHTML = '<img loading="lazy" src="' + rp.image + '" alt="' + escHtml(rp.name) + '"><b>' + escHtml(rp.name) + "</b><small>" + fmt(rp.price) + " تومان</small>";
      rc.addEventListener("click", function () {
        window.location.href = "product.html?slug=" + rp.slug;
      });
      rg.appendChild(rc);
    });

    // size guide
    var sg2 = document.getElementById("sizeGuideLink2");
    if (sg2) sg2.addEventListener("click", function (e) {
      e.preventDefault();
      window.showToast("راهنمای سایز: S=48cm, M=51cm, L=54cm, XL=57cm, XXL=60cm عرض سینه");
    });

    loadReviews();
    loadQA();
  }

  // ---------- نظرات ----------
  function loadReviews() {
    var box = document.getElementById("reviewsBox");
    var p = product;
    API.get("/products/" + p.id + "/reviews")
      .then(function (d) {
        var items = d.data.items || [];
        if (!items.length) {
          box.innerHTML = '<p style="color:#a9a39a; padding:10px 0;">هنوز نظری ثبت نشده — اولین نفر باش 🌀</p>';
        } else {
          box.innerHTML = items.map(function (rv) {
            var av = (escHtml((rv.user || "?").trim().charAt(0)));
            return '<div class="review-card"><div class="review-head"><div class="review-avatar">' + av + '</div>' +
              "<div><b style=\"font-size:0.88rem;\">" + escHtml(rv.user) + '</b><div class="review-meta">' + "★".repeat(rv.rating) + " • " + fmtDate(rv.createdAt) + "</div></div></div>" +
              '<p style="font-size:0.86rem; color:#c9c2b5; line-height:1.8;">' + escHtml(rv.body) + "</p></div>";
          }).join("");
        }
        renderReviewForm();
      })
      .catch(function () {
        box.innerHTML = '<p style="color:#a9a39a;">خطا در بارگذاری نظرات</p>';
      });
  }

  function renderReviewForm() {
    var wrap = document.getElementById("reviewFormWrap");
    if (!wrap) return;
    if (!user) {
      wrap.innerHTML = '<div style="margin-top:14px; padding:14px; border:1px dashed rgba(255,255,255,0.10); border-radius:12px; text-align:center;"><p style="color:#a9a39a; font-size:0.82rem;">فقط خریداران می‌تونن نظر بدن — <a href="account.html" style="color:var(--cyan)">ورود/ثبت‌نام</a></p></div>';
      return;
    }
    wrap.innerHTML =
      '<div style="margin-top:16px; padding:16px; border:1px solid rgba(255,255,255,0.08); border-radius:14px;">' +
      "<h4 style=\"margin-bottom:10px; font-size:0.9rem;\">نظر خودت رو بنویس ⭐</h4>" +
      '<div style="display:flex; gap:14px; flex-wrap:wrap; align-items:flex-start;">' +
      '<div><label style="font-size:0.72rem; color:#a9a39a;">امتیاز</label><div id="starPick" style="display:flex; gap:4px; font-size:1.3rem; cursor:pointer;">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<span data-star="' + n + '" style="color:rgba(255,255,255,0.2)">★</span>'; }).join("") +
      "</div></div>" +
      '<div style="flex:1; min-width:220px;"><label style="font-size:0.72rem; color:#a9a39a;">متن</label><textarea id="rvBody" rows="3" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit; font-size:0.85rem;" placeholder="تجربه‌ات از محصول رو بنویس..."></textarea></div>' +
      "</div>" +
      '<p id="rvErr" style="color:#ff2d95; font-size:0.78rem; margin:8px 0 0;"></p>' +
      '<button class="btn btn-primary" id="rvSubmit" style="margin-top:10px; padding:10px 22px;" type="button">ثبت نظر</button>' +
      "</div>";

    var rating = 5;
    document.getElementById("starPick").addEventListener("click", function (e) {
      var s = e.target.closest("[data-star]");
      if (!s) return;
      rating = parseInt(s.dataset.star, 10);
      document.querySelectorAll("#starPick [data-star]").forEach(function (x) {
        x.style.color = parseInt(x.dataset.star, 10) <= rating ? "var(--amber)" : "rgba(255,255,255,0.2)";
      });
    });
    document.querySelectorAll("#starPick [data-star]").forEach(function (x) {
      x.style.color = parseInt(x.dataset.star, 10) <= rating ? "var(--amber)" : "rgba(255,255,255,0.2)";
    });

    document.getElementById("rvSubmit").addEventListener("click", function () {
      var errEl = document.getElementById("rvErr");
      errEl.textContent = "";
      var body = document.getElementById("rvBody").value.trim();
      API.post("/products/" + product.id + "/reviews", { rating: rating, body: body })
        .then(function (d) {
          window.showToast && window.showToast(d.message || "نظرت ثبت شد ⭐");
          loadReviews();
        })
        .catch(function (err) { errEl.textContent = API.msg(err); });
    });
  }

  // ---------- Q&A ----------
  function loadQA() {
    var box = document.getElementById("qaBox");
    var p = product;
    API.get("/products/" + p.id + "/questions")
      .then(function (d) {
        var items = d.data.items || [];
        if (!items.length) {
          box.innerHTML = '<p style="color:#a9a39a; padding:10px 0;">سوالی ثبت نشده — بپرس 🎸</p>';
        } else {
          box.innerHTML = items.map(function (q) {
            return '<div class="qa-item"><b>س: ' + escHtml(q.question) + ' <span style="color:#7a7570; font-weight:400; font-size:0.76rem;">— ' + escHtml(q.author || "مهمان") + "</span></b>" +
              (q.answer ? "<p>ج: " + escHtml(q.answer) + "</p>" : '<p style="color:#7a7570; font-size:0.78rem;">هنوز جواب نشده...</p>') + "</div>";
          }).join("");
        }
        renderQAForm();
      })
      .catch(function () {
        box.innerHTML = '<p style="color:#a9a39a;">خطا در بارگذاری سوال‌ها</p>';
      });
  }

  function renderQAForm() {
    var wrap = document.getElementById("qaFormWrap");
    if (!wrap) return;
    var authorName = user ? user.name : "";
    wrap.innerHTML =
      '<div style="margin-top:16px; padding:16px; border:1px solid rgba(255,255,255,0.08); border-radius:14px;">' +
      "<h4 style=\"margin-bottom:10px; font-size:0.9rem;\">یه سوال داری؟ بپرس 🎸</h4>" +
      (user ? "" : '<div style="margin-bottom:8px;"><label style="font-size:0.72rem; color:#a9a39a;">اسمت</label><input id="qaName" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:8px 10px; font-family:inherit; font-size:0.82rem;" placeholder="با چه اسمی جواب بیاد؟"></div>') +
      '<div><label style="font-size:0.72rem; color:#a9a39a;">سوال</label><textarea id="qaText" rows="2" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit; font-size:0.85rem;" placeholder="سوال خودت رو بنویس..."></textarea></div>' +
      '<p id="qaErr" style="color:#ff2d95; font-size:0.78rem; margin:8px 0 0;"></p>' +
      '<button class="btn btn-primary" id="qaSubmit" style="margin-top:10px; padding:10px 22px;" type="button">ثبت سوال</button>' +
      "</div>";

    document.getElementById("qaSubmit").addEventListener("click", function () {
      var errEl = document.getElementById("qaErr");
      errEl.textContent = "";
      var payload = { question: document.getElementById("qaText").value.trim() };
      if (!user) payload.authorName = (document.getElementById("qaName").value || "").trim();
      API.post("/products/" + product.id + "/questions", payload)
        .then(function (d) {
          window.showToast && window.showToast(d.message || "سوالت ثبت شد 🎸");
          loadQA();
        })
        .catch(function (err) { errEl.textContent = API.msg(err); });
    });
  }
})();

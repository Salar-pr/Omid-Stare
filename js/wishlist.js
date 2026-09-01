// WISHLIST.JS — علاقه‌مندی‌های من (از API)
(function () {
  var fmt = window.fmtNum;
  var user = null;
  var root = document.getElementById("wishRoot");
  var toolbar = document.getElementById("wishToolbar");
  var countTop = document.getElementById("wishCountTop");
  var addAllBtn = document.getElementById("addAllToCart");
  var clearBtn = document.getElementById("clearWishlist");

  if (!root) return;

  function render(items) {
    root.innerHTML = "";
    if (!items.length) {
      if (toolbar) toolbar.style.display = "none";
      root.innerHTML = '<div class="wish-empty"><b>هنوز چیزی لایک نکردی ♡</b><p>برو فروشگاه، رو قلب بزن تا اینجا بیاد.</p><a class="btn btn-primary" href="shop.html" style="margin-top:16px;">برو فروشگاه</a></div>';
      return;
    }
    if (toolbar) toolbar.style.display = "flex";
    if (countTop) countTop.textContent = fmt(items.length);

    var grid = document.createElement("div");
    grid.className = "wish-grid";

    items.forEach(function (p) {
      var card = document.createElement("div");
      card.className = "wish-card product-card";
      var r = Math.round(p.rating || 0);
      card.innerHTML =
        '<button class="remove-wish" data-id="' + p.id + '" type="button" title="حذف از علاقه‌مندی‌ها">✕</button>' +
        '<div class="thumb"><img loading="lazy" src="' + p.image + '" alt="' + p.name + '"></div>' +
        "<h3>" + p.name + "</h3>" +
        '<div class="product-meta"><span class="stars">' + "★".repeat(r) + '</span><span>' + (p.rating || "–") + " • " + fmt(p.reviewsCount) + " نظر</span></div>" +
        '<div class="row"><div class="price">' + fmt(p.price) + ' <small>تومان</small></div><div style="display:flex; gap:6px;"><button class="btn btn-ghost" data-remove="' + p.id + '" type="button" style="padding:8px 12px; font-size:0.72rem;">حذف</button><button class="add-btn" type="button">افزودن به سبد</button></div></div>';

      card.addEventListener("click", function (e) {
        if (e.target.closest(".remove-wish") || e.target.closest(".add-btn")) return;
        localStorage.setItem("or_last_product", p.slug);
        window.location.href = "product.html?slug=" + p.slug;
      });

      function doRemove() {
        API.del("/wishlist/" + p.id)
          .then(function (d) {
            window.showToast && window.showToast("از علاقه‌مندی‌ها حذف شد ♡");
            render(d.data.items);
          })
          .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
      }
      card.querySelector(".remove-wish").addEventListener("click", function (e) { e.stopPropagation(); doRemove(); });
      var rm2 = card.querySelector("[data-remove]");
      if (rm2) rm2.addEventListener("click", function (e) { e.stopPropagation(); doRemove(); });

      card.querySelector(".add-btn").addEventListener("click", function (e) {
        e.stopPropagation();
        var btn = this;
        var size = p.sizes && p.sizes.length ? p.sizes[0] : null;
        var color = p.colors && p.colors.length ? p.colors[0].name : null;
        API.post("/cart/items", { productId: p.id, quantity: 1, selectedSize: size, selectedColor: color })
          .then(function () {
            var orig = btn.textContent;
            btn.classList.add("added"); btn.textContent = "✓ اضافه شد";
            setTimeout(function () { btn.classList.remove("added"); btn.textContent = orig; }, 1200);
            window.showToast && window.showToast(p.name + " به سبد اضافه شد 🛒");
          })
          .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
      });

      grid.appendChild(card);
    });

    root.appendChild(grid);
  }

  API.me().then(function (u) {
    user = u;
    if (!user) { window.location.replace("account.html"); return; }
    API.get("/wishlist")
      .then(function (d) { render(d.data.items || []); })
      .catch(function (err) {
        root.innerHTML = '<p style="color:#ff2d95; text-align:center;">' + API.msg(err) + "</p>";
      });
  });

  if (addAllBtn) {
    addAllBtn.addEventListener("click", function () {
      API.get("/wishlist").then(function (d) {
        var items = d.data.items || [];
        if (!items.length) return;
        var chain = Promise.resolve();
        items.forEach(function (p) {
          chain = chain.then(function () {
            var size = p.sizes && p.sizes.length ? p.sizes[0] : null;
            var color = p.colors && p.colors.length ? p.colors[0].name : null;
            return API.post("/cart/items", { productId: p.id, quantity: 1, selectedSize: size, selectedColor: color })
              .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
          });
        });
        chain.then(function () {
          window.showToast && window.showToast(fmt(items.length) + " محصول به سبد اضافه شد 🛒 — میری سبد");
          setTimeout(function () { window.location.href = "cart.html"; }, 1000);
        });
      });
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      if (!confirm("همه علاقه‌مندی‌ها پاک شه؟")) return;
      API.del("/wishlist")
        .then(function () {
          window.showToast && window.showToast("ویش‌لیست خالی شد");
          render([]);
        })
        .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
    });
  }
})();

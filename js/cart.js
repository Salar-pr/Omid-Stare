// CART.JS — سبد واقعی (سرور) + کوپن + ثبت سفارش
(function () {
  var fmt = window.fmtNum;
  var user = null;
  var cart = null;      // {items, subtotal, count}
  var myCoupons = [];   // active coupons
  var selectedCoupon = null;
  var quote = null;     // نتیجه quote با کوپن

  var root = document.getElementById("cartRoot");

  function needAuth() {
    window.location.replace("account.html");
  }

  function render() {
    if (!cart) { root.innerHTML = '<p style="padding:40px; text-align:center; color:#a9a39a;">در حال لود...</p>'; return; }

    if (!cart.items.length) {
      root.innerHTML = '<div class="empty-cart rv on"><b>سبدت خالیه — ووید ساکته 🌀</b><p style="margin:10px 0 18px; color:#a9a39a;">یه چیزی بنداز تو سبد تا پرتال روشن شه.</p><a class="btn btn-primary" href="shop.html">برو فروشگاه</a></div>';
      return;
    }

    var list = cart.items.map(function (it, idx) {
      var variant = [it.selectedSize, it.selectedColor].filter(Boolean).join(" • ");
      var stateBadge = it.state === "out"
        ? '<span class="stock out">ناموجود شده</span>'
        : (it.state === "low" ? '<span class="stock low">تنها ' + fmt(it.stock) + ' مانده</span>' : "");
      return '<div class="cart-item" data-idx="' + idx + '">' +
        '<img src="' + it.image + '" alt="' + it.name + '">' +
        '<div class="info"><b>' + it.name + (variant ? '<small style="display:block; color:#a9a39a; font-size:0.7rem;">' + variant + "</small>" : "") + "</b>" +
        "<small>" + fmt(it.unitPrice) + " تومان" + (stateBadge ? " " + stateBadge : "") + "</small></div>" +
        '<div class="qty-box"><button type="button" class="plus" data-id="' + it.id + '">+</button><span>' + fmt(it.quantity) + '</span><button type="button" class="minus" data-id="' + it.id + '">−</button></div>' +
        '<button class="remove-btn" type="button" data-id="' + it.id + '">✕</button>' +
        "</div>";
    }).join("");

    var couponOptions = myCoupons.length
      ? myCoupons.map(function (c) {
        var label = c.campaignName + " (" + c.codeLast4 + ") — " +
          (c.discountType === "percentage" ? c.discountValue + "٪" : fmt(c.discountValue) + " تومان");
        return '<option value="' + c.id + '"' + (selectedCoupon && selectedCoupon.id === c.id ? " selected" : "") + ">" + label + "</option>";
      }).join("")
      : '<option value="">کودی نداری</option>';

    var total = quote ? quote.total : cart.subtotal;
    var discount = quote ? quote.discountAmount : 0;
    var shipping = quote ? quote.shippingAmount : 0;

    root.innerHTML =
      '<div class="cart-wrap">' +
      '<div class="cart-items">' + list + "</div>" +
      '<div class="cart-summary">' +
      '<div class="sum-row"><span>تعداد</span><b>' + fmt(cart.count) + " آیتم</b></div>" +
      '<div class="sum-row"><span>جمع</span><b>' + fmt(cart.subtotal) + " تومان</b></div>" +
      (discount ? '<div class="sum-row" style="color:var(--lime)"><span>تخفیف (' + (selectedCoupon ? selectedCoupon.campaignName : "") + ')</span><b>- ' + fmt(discount) + " تومان</b></div>" : "") +
      (shipping ? '<div class="sum-row"><span>ارسال</span><b>' + fmt(shipping) + " تومان</b></div>" : "") +
      '<div class="sum-row grand"><span>قابل پرداخت</span><b>' + fmt(total) + " تومان</b></div>" +
      '<div style="margin:10px 0;">' +
      '<label style="font-size:0.72rem; color:#a9a39a; display:block; margin-bottom:6px;">کد تخفیف 🎟️</label>' +
      '<select id="couponSel" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit;">' +
      '<option value="">بدون کوپن</option>' + couponOptions +
      "</select>" +
      '<div id="claimRow" style="margin-top:10px; display:flex; gap:8px;">' +
      '<input id="claimCode" placeholder="XXXX-XXXX-XXXX-XXXX" dir="ltr" style="flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:9px 12px; font-family:monospace; letter-spacing:1px;">' +
      '<button id="claimBtn" class="btn btn-ghost" type="button" style="padding:9px 16px; font-size:0.75rem;">اعمال کد</button>' +
      "</div>" +
      "</div>" +
      '<div style="border-top:1px dashed rgba(255,255,255,0.12); margin-top:14px; padding-top:14px;">' +
      '<label style="font-size:0.72rem; color:#a9a39a; display:block; margin-bottom:6px;">نام و نام خانوادگی</label>' +
      '<input id="coName" value="' + esc(user.name) + '" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit; font-size:0.85rem; margin-bottom:8px;">' +
      '<label style="font-size:0.72rem; color:#a9a39a; display:block; margin-bottom:6px;">موبایل</label>' +
      '<input id="coPhone" placeholder="09121234567" dir="ltr" style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit; font-size:0.85rem; margin-bottom:8px;">' +
      '<label style="font-size:0.72rem; color:#a9a39a; display:block; margin-bottom:6px;">آدرس کامل</label>' +
      '<textarea id="coAddress" rows="2" placeholder="استان، شهر، خیابان، پلاک..." style="width:100%; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:10px; color:#f7f2e8; padding:10px; font-family:inherit; font-size:0.85rem;"></textarea>' +
      '<p id="coErr" style="color:#ff2d95; font-size:0.78rem; margin:8px 0 0;"></p>' +
      '<button class="btn btn-primary checkout-btn" id="checkoutBtn" type="button" style="width:100%; margin-top:8px;">ثبت سفارش 🌀</button>' +
      '<p style="margin-top:12px; color:#7a7570; font-size:0.7rem; letter-spacing:1px; text-align:center;">پرداخت هنگام تحویل/به‌صورت دستی — سفارش در تاریخچه‌ات ثبت میشه.</p>' +
      "</div>" +
      "</div>" +
      "</div>";

    // qty +/-
    root.querySelectorAll(".plus").forEach(function (b) {
      b.addEventListener("click", function () { changeQty(b.dataset.id, +1); });
    });
    root.querySelectorAll(".minus").forEach(function (b) {
      b.addEventListener("click", function () { changeQty(b.dataset.id, -1); });
    });
    root.querySelectorAll(".remove-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        API.del("/cart/items/" + b.dataset.id)
          .then(function (d) { cart = d.data; afterCartChange(); })
          .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
      });
    });

    var sel = document.getElementById("couponSel");
    sel.addEventListener("change", function () {
      selectedCoupon = myCoupons.find(function (c) { return c.id === sel.value; }) || null;
      refreshQuote();
    });

    document.getElementById("claimBtn").addEventListener("click", function () {
      var code = document.getElementById("claimCode").value.trim();
      if (!code) return;
      API.post("/coupons/claim", { code: code })
        .then(function (d) {
          window.showToast && window.showToast(d.message || "کد اضافه شد 🎟️");
          selectedCoupon = d.data;
          loadCouponsThenRender();
        })
        .catch(function (err) {
          window.showToast && window.showToast(API.msg(err), true);
        });
    });

    document.getElementById("checkoutBtn").addEventListener("click", placeOrder);
  }

  function esc(s) {
    return String(s || "").replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function changeQty(itemId, delta) {
    var item = cart.items.find(function (x) { return x.id === itemId; });
    if (!item) return;
    var q = item.quantity + delta;
    if (q < 1) return;
    API.patch("/cart/items/" + itemId, { quantity: q })
      .then(function (d) { cart = d.data; afterCartChange(); })
      .catch(function (err) { window.showToast && window.showToast(API.msg(err), true); });
  }

  function afterCartChange() {
    refreshQuote();
    render();
  }

  function refreshQuote() {
    if (!selectedCoupon) { quote = null; return; }
    API.get("/cart/quote?couponId=" + selectedCoupon.id)
      .then(function (d) { quote = d.data; render(); })
      .catch(function (err) {
        quote = null;
        selectedCoupon = null;
        window.showToast && window.showToast(API.msg(err, "کوپن اعمال نشد"), true);
        render();
      });
  }

  function loadCouponsThenRender() {
    return API.get("/coupons/my")
      .then(function (d) { myCoupons = (d.data.items || []).filter(function (c) { return c.state === "claimed"; }); })
      .catch(function () { myCoupons = []; })
      .then(function () { render(); });
  }

  function placeOrder() {
    var errEl = document.getElementById("coErr");
    errEl.textContent = "";
    var payload = {
      customerName: document.getElementById("coName").value.trim(),
      customerPhone: document.getElementById("coPhone").value.trim(),
      shippingAddress: document.getElementById("coAddress").value.trim(),
      couponId: selectedCoupon ? selectedCoupon.id : undefined,
    };
    var btn = document.getElementById("checkoutBtn");
    btn.disabled = true;
    API.post("/orders", payload)
      .then(function (d) {
        var o = d.data;
        root.innerHTML =
          '<div class="empty-cart rv on" style="text-align:center;">' +
          '<div style="font-size:3rem;">🌀</div>' +
          "<b style=\"font-size:1.1rem;\">سفارشت ثبت شد!</b>" +
          '<p style="margin:10px 0 4px; color:#a9a39a;">شماره سفارش: <span style="color:var(--cyan); font-family:monospace; direction:ltr;">' + o.orderNumber + "</span></p>" +
          '<p style="margin:4px 0 18px; color:#a9a39a;">جمع کل: <b style="color:var(--lime)">' + fmt(o.totalAmount) + " تومان</b></p>" +
          '<a class="btn btn-primary" href="orders.html">دیدن سفارش‌های من</a>' +
          "</div>";
      })
      .catch(function (err) {
        errEl.textContent = API.msg(err);
        btn.disabled = false;
      });
  }

  // init
  API.me().then(function (u) {
    user = u;
    if (!user) { needAuth(); return; }
    API.get("/cart")
      .then(function (d) { cart = d.data; return loadCouponsThenRender(); })
      .catch(function (err) {
        root.innerHTML = '<p style="padding:40px; text-align:center; color:#ff2d95;">' + API.msg(err) + "</p>";
      });
  });
})();

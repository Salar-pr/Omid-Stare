// ORDERS.JS — سفارش‌های من (از API)
(function () {
  var fmt = window.fmtNum;
  var user = null;
  var listEl = document.getElementById("ordersList");
  var emptyBox = document.getElementById("ordersEmpty");

  if (!listEl) return;

  API.me().then(function (u) {
    user = u;
    if (!user) { window.location.replace("account.html"); return; }
    API.get("/orders")
      .then(function (d) {
        var orders = d.data.items || [];
        if (!orders.length) { emptyBox.style.display = "block"; return; }
        emptyBox.style.display = "none";
        orders.forEach(function (order, i) {
          var card = document.createElement("div");
          card.className = "order-card rv on";

          var statusLabel = {
            pending: "در انتظار", confirmed: "تأیید شده", processing: "در حال پردازش",
            shipped: "ارسال شد", delivered: "تحویل شده", cancelled: "لغو شده",
          }[order.status] || order.status;
          var payLabel = {
            unpaid: "پرداخت نشده", pending: "در انتظار پرداخت", paid: "پرداخت شده",
            failed: "ناموفق", refunded: "برگشت خورده",
          }[order.paymentStatus] || order.paymentStatus;

          var head = document.createElement("div");
          head.className = "order-head";
          head.innerHTML =
            '<span class="o-id" style="font-family:monospace; direction:ltr;">' + order.orderNumber + "</span>" +
            '<span class="o-date">' + fmtDate(order.createdAt) + "</span>" +
            '<span style="color:var(--cyan); font-size:0.72rem;">' + statusLabel + " • " + payLabel + "</span>" +
            (order.couponLast4 ? '<span style="color:var(--lime); font-size:0.7rem;">کد تخفیف ••' + order.couponLast4 + "</span>" : "");
          card.appendChild(head);

          var foot = document.createElement("div");
          foot.className = "o-total";
          foot.innerHTML =
            '<span>مبلغ کل</span><b>' + fmt(order.totalAmount) + " تومان</b>" +
            (order.discountAmount ? '<span style="color:var(--lime); font-size:0.72rem;">تخفیف: -' + fmt(order.discountAmount) + "</span>" : "");
          card.appendChild(foot);

          var detailsBtn = document.createElement("button");
          detailsBtn.className = "btn btn-ghost";
          detailsBtn.style.cssText = "margin-top:10px; padding:8px 18px; font-size:0.75rem;";
          detailsBtn.textContent = "جزئیات و تاریخچه";
          detailsBtn.addEventListener("click", function () { showDetail(order.id); });
          card.appendChild(detailsBtn);

          var detailsBox = document.createElement("div");
          detailsBox.style.cssText = "display:none; margin-top:10px; padding-top:10px; border-top:1px dashed rgba(255,255,255,0.12);";
          card.appendChild(detailsBox);

          listEl.appendChild(card);
        });
      })
      .catch(function (err) {
        listEl.innerHTML = '<p style="color:#ff2d95; text-align:center;">' + API.msg(err) + "</p>";
      });
  });

  function showDetail(orderId) {
    var box = document.getElementById("ordersList").children;
    API.get("/orders/" + orderId)
      .then(function (d) {
        var o = d.data;
        var target = null;
        var cards = Array.prototype.slice.call(document.getElementById("ordersList").children);
        cards.forEach(function (c) {
          if (c.querySelector(".o-id") && c.querySelector(".o-id").textContent.trim() === o.orderNumber) target = c;
        });
        if (!target) return;
        var db = target.lastElementChild;
        db.innerHTML =
          '<div class="o-items">' +
          o.items.map(function (it) {
            var variant = escHtml([it.selectedSize, it.selectedColor].filter(Boolean).join(" • "));
            return '<div class="o-item">' + (it.image ? '<img src="' + it.image + '" alt="">' : "") +
              "<b>" + escHtml(it.productName) + (variant ? ' <small style="color:#a9a39a;">(' + variant + ")</small>" : "") + "</b>" +
              "<span>×" + fmt(it.quantity) + "</span><span>" + fmt(it.lineTotal) + " ت</span></div>";
          }).join("") +
          "</div>" +
          '<div style="margin-top:10px; font-size:0.78rem; color:#a9a39a;">' +
          (o.shippingAddress ? "آدرس: " + escHtml(o.shippingAddress) + " — " : "") +
          (o.customerPhone ? 'موبایل: <span dir="ltr">' + escHtml(o.customerPhone) + "</span>" : "") +
          "</div>" +
          '<div style="margin-top:10px;"><b style="font-size:0.78rem; color:#c9c2b5;">تاریخچه سفارش:</b><ul style="list-style:none; padding:0; margin:6px 0 0;">' +
          o.history.map(function (h) {
            return "<li style=\"font-size:0.75rem; color:#7a7570; padding:3px 0;\">" +
              (h.fromStatus ? escHtml(h.fromStatus) + " → " : "") + escHtml(h.toStatus) +
              " — " + escHtml(h.actor || "") + (h.note ? ' ("' + escHtml(h.note) + '")' : "") +
              " — " + fmtDate(h.at) + "</li>";
          }).join("") +
          "</ul></div>";
        db.style.display = "block";
      })
      .catch(function (err) {
        window.showToast && window.showToast(API.msg(err), true);
      });
  }
})();

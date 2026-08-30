// ============================================
// TOAST.JS — پیام‌های داخل‌سایتی
// ============================================

window.showToast = function (msg, isError) {
  var old = document.querySelector(".toast");
  if (old) old.remove();

  var t = document.createElement("div");
  t.className = "toast" + (isError ? " error" : "");
  t.textContent = msg;
  document.body.appendChild(t);

  requestAnimationFrame(function () { t.classList.add("show"); });
  setTimeout(function () { t.remove(); }, 2600);
};

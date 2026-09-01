// ============================================
// FX.JS — انیمیشن ظاهر شدن با اسکرول
// کارت‌هایی که بعداً با JS رندر می‌شوند (آلبوم‌ها، محصول‌های ویژه و...)
// هم باید observer شوند وگرنه .rv بدون .on می‌مانند → نامرئی می‌شوند.
// ============================================

(function () {
  var els = document.querySelectorAll(".rv");

  if (!("IntersectionObserver" in window)) {
    els.forEach(function (e) { e.classList.add("on"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add("on");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });

  var seen = new WeakSet();
  function watch(el) {
    if (!el || seen.has(el)) return;
    seen.add(el);
    io.observe(el);
  }
  els.forEach(watch);

  // المنتهایی که بعداً به DOM اضافه می‌شوند را هم بگیر (innerHTML injections)
  if ("MutationObserver" in window) {
    var mo = new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.classList && n.classList.contains("rv")) watch(n);
          if (n.querySelectorAll) n.querySelectorAll(".rv").forEach(watch);
        });
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }
})();

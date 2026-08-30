// ============================================
// FX.JS — انیمیشن ظاهر شدن با اسکرول
// ============================================

(function () {
  var els = document.querySelectorAll(".rv");
  if (!els.length) return;

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

  els.forEach(function (e) { io.observe(e); });
})();

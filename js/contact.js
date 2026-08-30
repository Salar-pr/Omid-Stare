// ============================================
// CONTACT.JS — اعتبارسنجی داخل‌سایتی فرم تماس
// ============================================

(function () {
  var form = document.getElementById("contactForm");
  if (!form) return;

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setErr(id, msg) {
    document.getElementById(id).textContent = msg || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = document.getElementById("name").value.trim();
    var email = document.getElementById("email").value.trim();
    var msg = document.getElementById("msg").value.trim();
    var ok = true;

    if (!name) { setErr("err-name", "اسمت رو بنویس! 🤘"); ok = false; }
    else { setErr("err-name"); }

    if (!email) { setErr("err-email", "ایمیل رو خالی نذار!"); ok = false; }
    else if (!emailRe.test(email)) { setErr("err-email", "این ایمیل معتبر نیست — یه نگاه دیگه بنداز."); ok = false; }
    else { setErr("err-email"); }

    if (!msg) { setErr("err-msg", "پیام خالی که نمی‌شه فرستاد!"); ok = false; }
    else { setErr("err-msg"); }

    if (!ok) {
      window.showToast("چند تا فیلد ایراد داره — درستشون کن 🎸", true);
      return;
    }

    form.reset();
    window.showToast("پیامت رسید! به‌زودی جواب می‌دم 🤘");
  });
})();

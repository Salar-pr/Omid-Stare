// ============================================
// CONTACT.JS — فرم تماس واقعی (POST /api/contact)
// ============================================
(function () {
  var form = document.getElementById("contactForm");
  if (!form) return;

  var nameEl = document.getElementById("cName");
  var emailEl = document.getElementById("cEmail");
  var msgEl = document.getElementById("cMsg");
  if (!nameEl || !emailEl || !msgEl) return;

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setErr(id, msg) {
    var el = document.getElementById(id);
    if (el) el.textContent = msg || "";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    var msg = msgEl.value.trim();
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

    var btn = form.querySelector("button[type=submit]");
    if (btn) btn.disabled = true;
    API.post("/contact", { name: name, email: email, message: msg })
      .then(function (d) {
        form.reset();
        window.showToast(d.message || "پیامت رسید! به‌زودی جواب می‌دم 🤘");
        if (btn) btn.disabled = false;
      })
      .catch(function (err) {
        setErr("err-msg", API.msg(err, "ارسال نشد — دوباره امتحان کن."));
        if (btn) btn.disabled = false;
      });
  });
})();

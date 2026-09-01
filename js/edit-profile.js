// ============================================
// EDIT-PROFILE.JS — ویرایش نام، رمز و عکس (API)
// ============================================
(function () {
  var DEFAULT_AVATAR = "images/avatar-default.png";
  var user = null;

  API.me().then(function (u) {
    user = u;
    if (!user) { window.location.replace("account.html"); return; }
    init();
  });

  function init() {
    var avatarImg = document.getElementById("avatarImg");
    var avatarInput = document.getElementById("avatarInput");
    document.getElementById("editName").value = user.name;
    document.getElementById("editEmail").value = user.email;
    if (user.avatarUrl) avatarImg.src = user.avatarUrl;

    // ---------- آپلود عکس (multipart → server) ----------
    document.getElementById("avatarEditBtn").addEventListener("click", function () {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", function () {
      var file = avatarInput.files[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        window.showToast("این فایل عکس نیست! 🎸", true);
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        window.showToast("عکس بزرگ‌تر از ۲ مگابایته — یه عکس سبک‌تر بذار.", true);
        return;
      }
      var fd = new FormData();
      fd.append("file", file);
      API.upload("/users/me/avatar", fd)
        .then(function (d) {
          avatarImg.src = d.data.avatarUrl;
          user.avatarUrl = d.data.avatarUrl;
          window.showToast("عکس پروفایلت آپدیت شد! 🤘");
        })
        .catch(function (err) {
          window.showToast(API.msg(err, "آپلود نشد"), true);
        });
    });

    // ---------- حذف عکس ----------
    document.getElementById("avatarRemoveBtn").addEventListener("click", function () {
      API.post("/users/me/avatar", {})
        .then(function (d) {
          avatarImg.src = d.data.avatarUrl || DEFAULT_AVATAR;
          user.avatarUrl = d.data.avatarUrl;
          window.showToast("برگشتی به آواتار پیش‌فرض 🖤");
        })
        .catch(function (err) {
          window.showToast(API.msg(err), true);
        });
    });

    // ---------- ذخیره فرم ----------
    function setErr(id, msg) {
      document.getElementById(id).textContent = msg || "";
    }

    document.getElementById("editForm").addEventListener("submit", function (e) {
      e.preventDefault();

      var name = document.getElementById("editName").value.trim();
      var curPass = document.getElementById("curPass").value;
      var newPass = document.getElementById("newPass").value;
      var ok = true;

      if (!name) { setErr("err-editName", "اسمت رو خالی نذار!"); ok = false; }
      else { setErr("err-editName"); }

      var wantsPassChange = curPass.length > 0 || newPass.length > 0;
      if (wantsPassChange) {
        if (!curPass) { setErr("err-curPass", "رمز فعلی رو وارد کن!"); ok = false; }
        else { setErr("err-curPass"); }
        if (newPass.length < 8) { setErr("err-newPass", "رمز جدید باید حداقل ۸ کاراکتر باشه."); ok = false; }
        else { setErr("err-newPass"); }
      } else {
        setErr("err-curPass");
        setErr("err-newPass");
      }

      if (!ok) {
        window.showToast("چند تا فیلد ایراد داره — درستشون کن 🎸", true);
        return;
      }

      var chain = Promise.resolve();
      chain = chain.then(function () {
        return API.patch("/users/me", { name: name }).then(function () { user.name = name; });
      });
      if (wantsPassChange) {
        chain = chain.then(function () {
          return API.post("/users/me/change-password", { currentPassword: curPass, newPassword: newPass });
        });
      }
      chain.then(function () {
        window.showToast("تغییرات ذخیره شد! 🤘");
        setTimeout(function () { window.location.href = "profile.html"; }, 1000);
      }).catch(function (err) {
        var m = API.msg(err, "ذخیره نشد");
        if (/رمز/.test(m)) setErr("err-curPass", m);
        else window.showToast(m, true);
      });
    });
  }
})();

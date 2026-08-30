// ============================================
// EDIT-PROFILE.JS — ویرایش نام، رمز و عکس
// ============================================

(function () {
  var SESSION_KEY = "or_session";
  var USERS_KEY = "or_users";
  var DEFAULT_AVATAR = "images/avatar-default.png";

  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch (e) { return null; }
  }
  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch (e) { return []; }
  }

  var session = getSession();
  if (!session) {
    window.location.replace("account.html");
    return;
  }

  var avatarKey = "or_avatar_" + session.email;
  var avatarImg = document.getElementById("avatarImg");
  var avatarInput = document.getElementById("avatarInput");

  // ---------- مقادیر فعلی ----------
  document.getElementById("editName").value = session.name;
  document.getElementById("editEmail").value = session.email;

  var savedAvatar = localStorage.getItem(avatarKey);
  if (savedAvatar) avatarImg.src = savedAvatar;

  // ---------- آپلود عکس ----------
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

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        localStorage.setItem(avatarKey, e.target.result);
        avatarImg.src = e.target.result;
        window.showToast("عکس پروفایلت آپدیت شد! 🤘");
      } catch (err) {
        window.showToast("عکس خیلی سنگینه و جا نشد — کوچیک‌ترش کن.", true);
      }
    };
    reader.readAsDataURL(file);
  });

  // ---------- حذف عکس ----------
  document.getElementById("avatarRemoveBtn").addEventListener("click", function () {
    localStorage.removeItem(avatarKey);
    avatarImg.src = DEFAULT_AVATAR;
    window.showToast("برگشتی به آواتار پیش‌فرض 🖤");
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

    var users = getUsers();
    var user = users.find(function (u) { return u.email === session.email; });

    // تغییر رمز فقط اگه یکی از فیلدها پر شده باشه
    var wantsPassChange = curPass.length > 0 || newPass.length > 0;
    if (wantsPassChange) {
      if (!curPass) { setErr("err-curPass", "رمز فعلی رو وارد کن!"); ok = false; }
      else if (user && user.pass !== curPass) { setErr("err-curPass", "رمز فعلی اشتباهه!"); ok = false; }
      else { setErr("err-curPass"); }

      if (newPass.length < 6) { setErr("err-newPass", "رمز جدید باید حداقل ۶ کاراکتر باشه."); ok = false; }
      else { setErr("err-newPass"); }
    } else {
      setErr("err-curPass");
      setErr("err-newPass");
    }

    if (!ok) {
      window.showToast("چند تا فیلد ایراد داره — درستشون کن 🎸", true);
      return;
    }

    // اعمال تغییرات
    if (user) {
      user.name = name;
      if (wantsPassChange) user.pass = newPass;
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    session.name = name;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    window.showToast("تغییرات ذخیره شد! 🤘");
    setTimeout(function () { window.location.href = "profile.html"; }, 1100);
  });
})();
